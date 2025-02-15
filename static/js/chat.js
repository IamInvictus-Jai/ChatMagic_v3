// DOM Elements
const chatInput = document.querySelector(".chat-input");
const sendButton = document.getElementById("send-button");
const micButton = document.getElementById("mic-button");
const chatMessages = document.querySelector(".chat-messages");
// const micIcon = micButton.querySelector(".mic-icon");
const clearText = document.querySelector("#clear-text-field");
const chatMenuBtn = document.querySelector(".chat-menu-btn");
const chatMenu = document.querySelector(".chat-menu");

// State Variables
let isMicActive = false;
let newConnection = true;
let isNewConnection = sessionStorage.getItem("isNewConnection") || "true";
isNewConnection = isNewConnection === "true";
let userID = document.querySelector(".user-id").value.trim();
let roomID = document.querySelector(".room-id").value.trim();
let hint_flag = false;

// Global variables
const deleteChatBtn = document.querySelector(".delete-chat-btn");
const chatContainer = document.querySelector(".chat-container");
const deletePopUp = document.querySelector(".delete-pop-up");
let deleteHandlerAttached = false;

let delete_bucket = [];

// Initialize UI States
document.querySelector(".chat-menu").style.height = "0";
document.querySelector(".chat-menu-btn").style.opacity = "0.7";
document.querySelector(".group-members").style.opacity = "0.7";

// WebSocket Setup
const extractID = () => {
  const regex = new RegExp(`${roomID.split("-")[0]}-(.*)`);
  const match = roomID.match(regex);
  return match && match[1] ? match[1] : null;
};

const timestamp = new Date().getTime();
const url = `ws://${
  window.location.host
}/ws/chat/${roomID}/${userID}/?&_=${timestamp}`;
const chatSocket = new WebSocket(url);

// Theme Management

const applyTheme = (gradient) => {
  document.documentElement.style.setProperty("--theme-gradient", gradient);
  const header = document.querySelector(".chat-header");
  const sendButton = document.getElementById("send-button");

  header.style.background = gradient;
  sendButton.style.background = gradient;
  localStorage.setItem("chatTheme", gradient);

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.gradient === gradient) {
      btn.classList.add("active");
    }
  });
};

const initializeTheme = () => {
  const savedTheme =
    localStorage.getItem("chatTheme") ||
    "linear-gradient(to right, #00f2fe, #4facfe)";
  applyTheme(savedTheme);
};

// Audio Functions
const playAudio = (audioType) => {
  const audioContext = new AudioContext();
  const source = audioContext.createBufferSource();
  const audio = `/static/audio/${
    audioType === "notify" ? "notify.mp3" : "pop notification.mp3"
  }`;

  fetch(audio)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    });
};

async function deleteMessages(message_id_bucket) {

  try {
    const userAuth = JSON.parse(sessionStorage.getItem("userData")) || null;
    const response = await fetch(`/api/delete-messages/`, {
      method: "POST",
      headers: {
        Authorization: userAuth.session_id || null,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        group_id: roomID,
        message_id_bucket: message_id_bucket
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data);
    } else {
      console.error("Failed to delete messages");
    }
  } catch (error) {
    console.error(error);
  }
  
}



// Helper function to toggle delete check
function toggleDeleteCheck(wrapper, shouldAdd) {
    const deleteCheck = wrapper.parentElement.querySelector(".delete-check");
    if (shouldAdd) {
        deleteCheck.classList.add("active");
        delete_bucket.push(wrapper);
    } else {
        deleteCheck.classList.remove("active");
        delete_bucket = delete_bucket.filter(item => item !== wrapper);
    }
}

// Helper function to clear delete bucket
function clearDeleteBucket() {
    delete_bucket.forEach(item => {
        item.parentElement.querySelector(".delete-check").classList.remove("active");
    });
    delete_bucket = [];
}

// Initialize delete message handlers
function initializeDeleteHandlers() {
    const cancelBtn = document.querySelector(".delete-message-btn.cancel");
    const deleteBtn = document.querySelector(".delete-message-btn.delete");

    // Remove existing event listeners if any
    cancelBtn.removeEventListener("click", handleCancel);
    deleteBtn.removeEventListener("click", handleDelete);

    // Add new event listeners
    cancelBtn.addEventListener("click", handleCancel);
    deleteBtn.addEventListener("click", handleDelete);
}

// Handler for cancel button
function handleCancel() {
    deletePopUp.classList.remove("active");
    clearDeleteBucket();
}

// Handler for delete button
async function handleDelete() {
    try {
        const messageIdBuckets = delete_bucket.map(item => item.dataset.id);
        
        // Remove messages from DOM
        delete_bucket.forEach(item => {
            item.parentElement.parentElement.remove();
        });
        
        deletePopUp.classList.remove("active");
        delete_bucket = [];

        toggleLoadingAnimation();
        await deleteMessages(messageIdBuckets);
        toggleLoadingAnimation();
    } catch (error) {
        console.error('Error deleting messages:', error);
        // Handle error appropriately
    }
}

// Message selection handler
function handleMessageSelection(e) {
    if (!deleteChatBtn.classList.contains("active")) return;
    
    const wrapper = e.target.closest(".message.sent");
    if (!wrapper) return;

    const isCurrentlyActive = wrapper.parentElement.querySelector(".delete-check").classList.contains("active");
    toggleDeleteCheck(wrapper, !isCurrentlyActive);
}

// Main delete chat button handler
deleteChatBtn.addEventListener("click", (e) => {
    e.target.classList.toggle("active");
    chatContainer.classList.toggle("active");

    // Handle deactivation
    if (!e.target.classList.contains("active")) {
        if (delete_bucket.length > 0) {
            
            deletePopUp.classList.add("active");
            initializeDeleteHandlers();
        }
        // Remove message selection handler when not in delete mode
        if (deleteHandlerAttached) {
            chatMessages.removeEventListener("click", handleMessageSelection);
            deleteHandlerAttached = false;
        }
    } else {
        // Add message selection handler when in delete mode
        if (!deleteHandlerAttached) {
            chatMessages.addEventListener("click", handleMessageSelection);
            deleteHandlerAttached = true;
        }
    }
});


// Message Handling Functions
const userResponse = (response, uuid) => {
  const time = new Date();
  const userMessageElement = `
    <div class="user">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class='fas fa-check delete-check'></div>
      <div class="message sent" data-id="${uuid}">
        ${response}
        <p class="message-time user">${time.getHours()}:${time.getMinutes()}</p>
        <p class="message-user-id user">YOU</p>
      </div>
    </div>
  `;
  const userMessage = document.createElement("div");
  userMessage.classList.add("message-wrapper");
  userMessage.innerHTML = userMessageElement;
  chatMessages.appendChild(userMessage);

  chatInput.value = "";
  chatInput.style.height = "auto";
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const update_chats = (data) => {
  if (userID === data.userID) return;

  playAudio("message");
  const time = new Date();
  const messageElement = `
    <div class="sender">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class="message received" data-id="${data.message_id}">
        ${data.message}
        <p class="message-time sender">${data.dt_time}</p>
        <p class="message-user-id sender">${data.userID}</p>
      </div>
    </div>
  `;
  const receivedMessage = document.createElement("div");
  receivedMessage.innerHTML = messageElement;
  receivedMessage.classList.add("message-wrapper");
  chatMessages.appendChild(receivedMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Members Panel Management
const initializeMembersPanel = () => {
  const panel = document.querySelector(".members-panel");
  const tabs = document.querySelectorAll(".tab-btn");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const targetId = tab.dataset.tab;
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(targetId).classList.add("active");
    });
  });
};

const updateMembersPanelList = (memberList) => {
  const adminList = document.querySelector(".admin-list");
  const membersList = document.querySelector(".members-list");
  // const activeMembersList = document.querySelector(".active-members-list");

  adminList.innerHTML = "";
  membersList.innerHTML = "";
  // activeMembersList.innerHTML = "";

  memberList.forEach((member) => {
    const memberElement = `
      <div class="member-item ${member.isAdmin ? "admin" : ""}">
        <div class="member-avatar"></div>
        <div class="member-info">
          <div class="member-name">${member.username}</div>
          ${member.isAdmin ? '<div class="member-badge">Admin</div>' : ""}
        </div>
      </div>
    `;
    // if (member.isAdmin) {
    //   adminList.innerHTML += memberElement;
    // } else {
    //   membersList.innerHTML += memberElement;
    // }
    membersList.innerHTML += memberElement;
  });
};

// Message Restriction
const initializeMessageRestriction = () => {
  const restrictToggle = document.getElementById("restrict-messages");
  const isAdmin = document.querySelector(".is-admin").value === "true";

  const updateInputState = () => {
    const restricted = localStorage.getItem("restrictMessages") === "true";
    if (restricted && !isAdmin) {
      chatInput.disabled = true;
      sendButton.disabled = true;
      document.getElementById("upload-button").style.pointerEvents = "none";
      chatInput.placeholder = "Only admins can send messages";
    } else {
      chatInput.disabled = false;
      sendButton.disabled = false;
      document.getElementById("upload-button").style.pointerEvents = "auto";
      chatInput.placeholder = "Type a message...";
    }
  };

  restrictToggle.addEventListener("change", () => {
    localStorage.setItem("restrictMessages", restrictToggle.checked);
    updateInputState();
    chatSocket.send(
      JSON.stringify({
        type: "restriction_change",
        restricted: restrictToggle.checked,
      })
    );
  });

  restrictToggle.checked = localStorage.getItem("restrictMessages") === "true";
  updateInputState();
};

// Image Upload Handling
const initializeImageUpload = () => {
  const fileInput = document.querySelector('.upload-btn input[type="file"]');

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      sendImageMessage(base64);
      fileInput.value = "";
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error uploading image. Please try again.");
    }
  });
};

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const sendImageMessage = (base64Image) => {
    let time = `${new Date().getHours()}:${new Date().getMinutes()}`
    const uuid = crypto.randomUUID();
    chatSocket.send(
      JSON.stringify({
        userID: userID,
        type: "image",
        message: base64Image,
        message_id: uuid,
        dt_time: time,
      })
    );

  const imageMessageElement = `
    <div class="user">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class='fas fa-check delete-check'></div>
      <div class="message sent image-message" data-id="${uuid}">
        <div class="file-container"><img src="${base64Image}" alt="Sent image" class='uploaded-files'></div>
        <p class="message-time user">${time}</p>
        <p class="message-user-id user">YOU</p>
      </div>
    </div>
  `;
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message-wrapper");
  messageDiv.innerHTML = imageMessageElement;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// WebSocket Event Handlers
chatSocket.onopen = () => {
  console.log("connected");
  const client_obj = {
    isNewConnection: isNewConnection,
    userID: userID,
  };

  if (!isNewConnection) {
    client_obj.type = "refresh";
    client_obj.channel_name = sessionStorage.getItem("channel_name");
  } else {
    sessionStorage.setItem("isNewConnection", false);
  }

  chatSocket.send(JSON.stringify(client_obj));
};

chatSocket.onmessage = function (event) {
  const data = JSON.parse(event.data);
  switch (data.statusCode) {
    case 200:
      if (data.type === "image") {
        displayReceivedImage(data);
      } else {
        update_chats(data);
      }
      break;
    case 202:
      console.log(data.server);
      break;
    case 204:
      update_members(data);
      // updateMembersPanelList(data.new_memberList);
      pop_notification(data.new_member, "joined the chat !");
      break;
    case 206:
      remove_member(data);
      // updateMembersPanelList(data.memberList);
      pop_notification(data.removed_member, "went offline!");
      break;
    case 208:
      update_members(data);
      // updateMembersPanelList(data.memberList);
      break;
    case 210:
      sessionStorage.setItem("channel_name", data.channel_name);
      break;
    case 212:
      localStorage.setItem("restrictMessages", data.restricted);
      document.getElementById("restrict-messages").checked = data.restricted;
      updateInputState();
      break;
  }
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeMembersPanel();
  initializeMessageRestriction();
  initializeImageUpload();

  // Initialize smooth scrolling
  chatMessages.style.scrollBehavior = "smooth";
});

chatInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
  if (this.value === "") {
    this.style.height = "auto";
  }

  if (this.value.trim().startsWith("@")) {
    if (hint_flag) return;
    document.querySelector(".type-hint").style.opacity = "1";
    hint_flag = true;
    setTimeout(() => {
      document.querySelector(".type-hint").style.opacity = "0";
    }, 5000);
  } else {
    hint_flag = false;
    document.querySelector(".type-hint").style.opacity = "0";
  }
});

chatInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.querySelector(".back-button").addEventListener("click", function () {
  this.style.transform = "translateX(-.8rem)";
  let session_id = JSON.parse(sessionStorage.getItem("userData")).session_id;
  setTimeout(() => {
    
    this.style.transform = "translateX(0)";
    sessionStorage.setItem("isNewConnection", "true"); 
    window.location.href = `/dashboard?username=${userID}&sessionID=${session_id}`;
  }, 200);
});

chatMenuBtn.addEventListener("click", () => {
  chatMenu.classList.toggle("active");
  chatMenu.style.height = chatMenu.style.height === "0px" ? "100%" : "0";
  chatMenuBtn.style.opacity = chatMenu.classList.contains("active")
    ? "1"
    : "0.7";
});

document.querySelector(".group-members").addEventListener("click", function () {
  const memberList = document.querySelector(".members-panel");
  this.style.opacity = this.style.opacity === "0.7" ? "1" : "0.7";
  memberList.classList.toggle("active");

  memberList.querySelector(".close-panel").addEventListener("click", () => {
    memberList.classList.remove("active");
    document.querySelector(".group-members").style.opacity =
      this.style.opacity === "0.7" ? "1" : "0.7";
  });
});

document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.gradient);
  });
});

clearText.addEventListener("click", () => {
  chatInput.value = "";
});

sendButton.addEventListener("click", sendMessage);

// Helper Functions
function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    const uuid = crypto.randomUUID();
    userResponse(message, uuid);

    chatSocket.send(
      JSON.stringify({
        userID: userID,
        message: message,
        message_id: uuid,
        dt_time: (`${new Date().getHours()}:${new Date().getMinutes()}`)
      })
    );
    chatInput.value = "";
  }
}

function pop_notification(member, message) {
  playAudio("notify");
  const notification = document.createElement("div");
  notification.classList.add("notify");
  notification.innerHTML = `<p>${member} ${message}</p>`;

  const notificationBox = document.querySelector(".notification-box");
  notificationBox.appendChild(notification);

  setTimeout(() => notification.remove(), 5200);
}

function displayReceivedImage(data) {

  if (data.userID === userID) return;
  
  const imageMessageElement = `
    <div class="sender">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class="message received image-message" data-id="${data.message_id}">
        <img src="${data.message}" alt="Received image">
        <p class="message-time sender">${data.dt_time}</p>
        <p class="message-user-id sender">${data.userID}</p>
      </div>
    </div>
  `;
  const messageDiv = document.createElement("div");
  messageDiv.innerHTML = imageMessageElement;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Member Management Functions
function update_members(data) {
  const new_member = data.new_member;
  const formattedMember = new_member.split(" ").join(".");
  const new_memberList = data.new_memberList;
  const members = document.querySelector(".active-members-list");

  if (newConnection) {
    new_memberList.forEach((member) => {
      const member_new = document.createElement("div");
      member_new.classList.add("member");

      if (member === userID) {
        member_new.classList.add("active");
      }

      const formattedMemberName = member.split(" ").join(".");
      member_new.classList.add(formattedMemberName);
      member_new.textContent = formattedMemberName;
      members.appendChild(member_new);
    });

    newConnection = false;
    return;
  }

  const member_new = document.createElement("div");
  member_new.classList.add("member");
  member_new.classList.add(formattedMember);
  member_new.textContent = formattedMember;
  members.appendChild(member_new);
}

function remove_member(data) {
  const removed_member = data.removed_member;
  if (!removed_member) return;

  const formattedMember = removed_member.split(" ").join(".");
  const members = document.querySelector(".active-members-list");
  const memberElement = members.querySelector(`.member.${formattedMember}`);

  if (memberElement) {
    members.removeChild(memberElement);
  }
}

// Member List State Management
function updateMemberState(memberList) {
  // Update active members count
  const activeMembers = memberList.filter((member) => member.isOnline).length;
  document.querySelector(".active-count").textContent = activeMembers;

  // Update total members count
  document.querySelector(".total-count").textContent = memberList.length;

  // Update member lists
  updateMemberCategories(memberList);
}

function updateMemberCategories(memberList) {
  const adminMembers = memberList.filter((member) => member.isAdmin);
  const regularMembers = memberList.filter((member) => !member.isAdmin);

  updateAdminList(adminMembers);
  updateRegularMembersList(regularMembers);
  updateActiveMembersList(memberList.filter((member) => member.isOnline));
}

function updateAdminList(adminMembers) {
  const adminList = document.querySelector(".admin-list");
  adminList.innerHTML = adminMembers
    .map((admin) => createMemberElement(admin, true))
    .join("");
}

function updateRegularMembersList(regularMembers) {
  const regularList = document.querySelector(".members-list");
  regularList.innerHTML = regularMembers
    .map((member) => createMemberElement(member, false))
    .join("");
}

function updateActiveMembersList(activeMembers) {
  const activeList = document.querySelector(".active-members-list");
  activeList.innerHTML = activeMembers
    .map((member) => createMemberElement(member, member.isAdmin))
    .join("");
}

function createMemberElement(member, isAdmin) {
  return `
    <div class="member-item ${isAdmin ? "admin" : ""} ${
    member.isOnline ? "online" : ""
  }"
         data-member-id="${member.userID}">
      <div class="member-avatar">
        <div class="status-indicator ${
          member.isOnline ? "online" : "offline"
        }"></div>
      </div>
      <div class="member-info">
        <div class="member-name">${member.userID}</div>
        ${isAdmin ? '<div class="member-badge">Admin</div>' : ""}
        <div class="member-status">${
          member.isOnline ? "Active" : "Inactive"
        }</div>
      </div>
    </div>
  `;
}

// Member Search Functionality
function initializeMemberSearch() {
  const searchInput = document.querySelector(".member-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const memberItems = document.querySelectorAll(".member-item");

    memberItems.forEach((item) => {
      const memberName = item
        .querySelector(".member-name")
        .textContent.toLowerCase();
      item.style.display = memberName.includes(searchTerm) ? "flex" : "none";
    });
  });
}

// Member Actions
function initializeMemberActions() {
  document.addEventListener("click", (e) => {
    const memberItem = e.target.closest(".member-item");
    if (!memberItem) return;

    const memberId = memberItem.dataset.memberId;
    const isAdmin = document.querySelector(".is-admin").value === "true";

    if (isAdmin && e.target.closest(".member-actions")) {
      showMemberActionMenu(memberId, e);
    }
  });
}

function showMemberActionMenu(memberId, event) {
  const actionMenu = document.createElement("div");
  actionMenu.className = "member-action-menu";
  actionMenu.innerHTML = `
    <div class="action-item" data-action="message">Message</div>
    <div class="action-item" data-action="promote">Promote to Admin</div>
    <div class="action-item" data-action="remove">Remove from Chat</div>
  `;

  // Position the menu
  actionMenu.style.position = "absolute";
  actionMenu.style.top = `${event.pageY}px`;
  actionMenu.style.left = `${event.pageX}px`;

  // Handle menu item clicks
  actionMenu.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    handleMemberAction(action, memberId);
    actionMenu.remove();
  });

  // Remove menu when clicking outside
  document.addEventListener("click", function closeMenu(e) {
    if (!actionMenu.contains(e.target)) {
      actionMenu.remove();
      document.removeEventListener("click", closeMenu);
    }
  });

  document.body.appendChild(actionMenu);
}

function handleMemberAction(action, memberId) {
  switch (action) {
    case "message":
      initializeDirectMessage(memberId);
      break;
    case "promote":
      promoteMember(memberId);
      break;
    case "remove":
      removeMemberFromChat(memberId);
      break;
  }
}

function initializeDirectMessage(memberId) {
  // Implementation for direct messaging
  console.log(`Initializing DM with ${memberId}`);
}

function promoteMember(memberId) {
  chatSocket.send(
    JSON.stringify({
      type: "promote_member",
      memberId: memberId,
    })
  );
}

function removeMemberFromChat(memberId) {
  if (confirm(`Are you sure you want to remove ${memberId} from the chat?`)) {
    chatSocket.send(
      JSON.stringify({
        type: "remove_member",
        memberId: memberId,
      })
    );
  }
}



function displayDbImages(message) {
  if (message.message_sender === userID) {
    const imageMessageElement = `
    <div class="user">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class='fas fa-check delete-check'></div>
      <div class="message sent image-message" data-id="${message.message_id}">
        <div class="file-container"><img src="${message.message}" alt="Sent image" class='uploaded-files'></div>
        <p class="message-time user">${message.date_created}</p>
        <p class="message-user-id user">YOU</p>
      </div>
    </div>
  `;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message-wrapper");
    messageDiv.innerHTML = imageMessageElement;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

  } else {
    const imageMessageElement = `
    <div class="sender">
      <div class="profile-pic message user"
        style="background: #969696 url('/static/images/user.png') center/cover;">
      </div>
      <div class="message received image-message" data-id="${message.message_id}">
        <img src="${message.message}" alt="Received image">
        <p class="message-time sender">${message.date_created}</p>
        <p class="message-user-id sender">${message.message_sender}</p>
      </div>
    </div>
  `;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message-wrapper");
    messageDiv.innerHTML = imageMessageElement;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function displayDbMessages(messages) {
  messages.forEach((message) => {

    if (message.type === "image") {
      displayDbImages(message);
      return;
    }

    let message_owener = message.message_sender;
    let message_creation_time = message.date_created;
    let message_class;
    let message_prop;
    let delete_check;
    let message_tag;

    if (message_owener === userID) {
      message_class = "user";
      message_prop = "sent";
      delete_check = "<div class='fas fa-check delete-check'></div>";
      message_tag = "YOU";
    } else {
      message_class = "sender";
      message_prop = "received";
      delete_check = "";
      message_tag = message_owener;
    }


    const messageElement = `
      <div class="${message_class}">
        <div class="profile-pic message user"
          style="background: #969696 url('/static/images/user.png') center/cover;">
        </div>
        ${delete_check}
        <div class="message ${message_prop}" data-id="${message.message_id}">
          ${message.message}
          <p class="message-time ${message_class}">${message_creation_time}</p>
          <p class="message-user-id ${message_class}">${message_tag}</p>
        </div>
    </div>
    `;
    const chat_message = document.createElement("div");
    chat_message.classList.add("message-wrapper");
    chat_message.innerHTML = messageElement;
    chatMessages.appendChild(chat_message);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateGroupDp(group_dp) {
  let avatar = document.querySelector(".group-profile-pic img");
  avatar.src = group_dp;
}



function toggleLoadingAnimation() {
  const loadingAnimation = document.querySelector(".process-loader-overlay");
  loadingAnimation.classList.toggle("active");
  document.body.style.overflow = loadingAnimation.classList.contains("active")
    ? "hidden"
    : "unset";
}



async function retreiveChatMessages() {
  const url = `/api/get-messages?group_id=${roomID}`;
  let data;

  toggleLoadingAnimation();
  try {
    const response = await fetch(url);

    if (response.ok) data = await response.json();
    if (data && data.success) {
      const group_dp = data.group_dp;
      const group_members = data.group_members;
      const messages = data.group_messages;

      // console.log(group_dp);
      // console.log(group_members);
      // console.log(messages);


      updateGroupDp(group_dp);
      updateMembersPanelList(group_members);
      displayDbMessages(messages);
    } else {
      alert(data.message);
    }    

  } catch (error) {
    console.error("Failed to fetch messages -> Error:", error);
  } finally {
    toggleLoadingAnimation();
  }
}




// Initialize member-related features
document.addEventListener("DOMContentLoaded", async () => {
  initializeMemberSearch();
  initializeMemberActions();
  await retreiveChatMessages();
});
