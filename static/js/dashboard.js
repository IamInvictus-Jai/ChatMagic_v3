// Theme management
const themeSwitcher = document.querySelector(".theme-switcher");
const themeDropdown = document.querySelector(".theme-dropdown");
const themeOptions = document.querySelectorAll(".theme-option");
const themeIcon = document.querySelector(".theme-icon");
const profileDropdown = document.querySelector(".profile-menu");
const groupsContainer = document.querySelector(".groups-container");
let userAuth = JSON.parse(sessionStorage.getItem("userData")) || null;
const threshold = 200;

// Sample groups data
let groups = [
  // { id: 0, group_name: "Family Group", avatar: "" , pinned: false, is_admin: "demo"},
  // { id: 1, group_name: "Work Team", avatar: "" , pinned: false, is_admin: "demo"},
  // { id: 2, group_name: "Friends Forever", avatar: "" , pinned: false, is_admin: "demo"},
  // { id: 3, group_name: "Book Club", avatar: "" , pinned: false, is_admin: "demo"},
];

// Get system theme
const getSystemTheme = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// Get current theme (from localStorage or system preference)
const getCurrentTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return savedTheme;
  return getSystemTheme();
};

// Update theme icon with animation
const updateThemeIcon = (theme) => {
  const actualTheme = theme === "system" ? getSystemTheme() : theme;

  themeIcon.classList.add("rotating");

  setTimeout(() => {
    if (actualTheme === "dark") {
      themeIcon.classList.replace("fa-sun", "fa-moon");
    } else {
      themeIcon.classList.replace("fa-moon", "fa-sun");
    }
    themeIcon.classList.remove("rotating");
  }, 150);
};

// Apply theme
const setTheme = (theme) => {
  // Update active state in dropdown
  themeOptions.forEach((option) => {
    option.classList.toggle("active", option.dataset.theme === theme);
  });

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", effectiveTheme);
  localStorage.setItem("theme", theme);

  updateThemeIcon(theme);
};

// Initialize theme
const initializeTheme = () => {
  const currentTheme = getCurrentTheme();
  setTheme(currentTheme);

  // Set initial icon
  const actualTheme =
    currentTheme === "system" ? getSystemTheme() : currentTheme;
  themeIcon.classList.add(actualTheme === "dark" ? "fa-moon" : "fa-sun");
};

// Watch for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "system") {
      setTheme("system");
    }
  });

// Theme switcher toggle
themeSwitcher.addEventListener("click", (e) => {
  themeDropdown.classList.toggle("active");
  e.stopPropagation();
}); 

// Theme option selection
themeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setTheme(option.dataset.theme);
    themeDropdown.classList.remove("active");
  });
});



function toggleLoadingAnimation() {
  const loadingAnimation = document.querySelector(".process-loader-overlay");
  loadingAnimation.classList.toggle("active");
  document.body.style.overflow = (loadingAnimation.classList.contains("active")) ? "hidden" : "unset";
}


// Fetch groups from the server
const fetchGroups = async () => {
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;
  if (!userData) return;

  const sessionID = userData.session_id || null;
  const username = userData.username || null;

  if (!sessionID) {
    console.error("No session ID found");
    return;
  }


  toggleLoadingAnimation()
  const base = "/api/get-user/groups";
  const url = `${base}?username=${encodeURIComponent(username)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": sessionID,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(data.message);

    const groupsContainer = document.querySelector(".groups-container");
    groups.push(...data.groups);

    if (groups.length === 0) {
      groupsContainer.innerHTML = "<div class='empty-state'>No groups found.</div>";
    }
    // console.log(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
  }

  finally {
    toggleLoadingAnimation()
  }
};


// Close dropdowns when clicking outside
document.addEventListener("click", () => {
  themeDropdown.classList.remove("active");
  document.querySelectorAll(".menu-dropdown.active").forEach((dropdown) => {
    dropdown.classList.remove("active");
  });
});





// Handle pin action
async function pinGroup(idx) {
  // Handle pin action
  let index;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].id === idx) {
      groups[i].pinned = !groups[i].pinned;
      index = i;
      break;
    }
  }

  let removed_grp = groups.splice(index, 1);

  if (!removed_grp[0].pinned) {
    groups.push(removed_grp[0]);
  } else {
    groups.unshift(removed_grp[0]);
  }

  // console.log(groups);

  const groupsContainer = document.querySelector(".groups-container");
  groupsContainer.innerHTML = "";

  groups.forEach((group) => {
    groupsContainer.appendChild(createGroupCard(group));
  });


  // Send pin request to the server
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;
  if (!userData) return;

  const sessionID = userData.session_id || null;
  const username = userData.username || null;

  if (!sessionID) {
    console.error("No session ID found");
    return;
  }
  const base = "/api/pin/group/";
  const url = `${base}`;

  toggleLoadingAnimation()
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: sessionID,
      },
      body: JSON.stringify({
        group_id: idx,
        pinned: removed_grp[0].pinned,
        username: username,
      }),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
  } finally {
    toggleLoadingAnimation()
  }

}

// Handle Edit Action
async function editGroup(idx) {
  console.log("Editing group");
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;
  if (!userData) return;

  let index;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].id === idx) {
      // groups[i].pinned = !groups[i].pinned;
      index = i;
      break;
    }
  }

  const sessionID = userData.session_id || null;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  document.getElementById("groupName").disabled = false;  
  document.querySelector("#groupName").classList.remove("active"); 

  document.getElementById("groupName").value = groups[index].group_name;
  document.querySelector(".modal-header h2").textContent = "Edit Group";
  document.querySelector(".create-btn").style.display = "none";
  document.querySelector(".edit-btn").style.display = "block";

  if (groups[index].avatar !== '' && groups[index].avatar !== null) {
    const imgElement = document.createElement("img");
    imgElement.src = groups[index].avatar;
    imgElement.alt = "Group Picture";
    imagePreview.innerHTML = "";
    imagePreview.appendChild(imgElement);
  }  else {
    imagePreview.innerHTML = `<i class="fas fa-users default-avatar"></i>`;
  }
  
  document.querySelector(".edit-btn").addEventListener("click", async () => {
    await updateGroupInfoDatabase(index);
  })
}

async function updateGroupInfoDatabase(index) {
  console.log("editing updating froup info database");
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;

  const formData = new FormData();
  formData.append("username", userData.username);
  formData.append("group_id", groups[index].id);
  let changes = false;

  if (groups[index].group_name !== document.getElementById("groupName").value) {
    formData.append("group_name", document.getElementById("groupName").value);
    changes = true;
  }
  if (fileInput.files[0]) {
    formData.append("group_avatar", fileInput.files[0]);
    changes = true;
  }

  if (!changes) {
    closeModal();
    return;
  }

  let new_group_name = document.getElementById("groupName").value;

  toggleLoadingAnimation()
  try {
    const response = await fetch("/api/update-group-info/", {
      method: "POST",
      headers: {
        Authorization: userAuth.session_id || null,
      },
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      groups[index].group_name = new_group_name;
      if (fileInput.files[0]) {
        groups[index].avatar = data.dp_url + `?v=${Date.now()}`;
        let target_group = document.querySelector(
          `.group-card[data-id="${groups[index].id}"] .groups-avatar-dp`
        );

        if (target_group === null) {
          document.querySelector(
            ".group-avatar"
          ).innerHTML = `<div class="group-avatar"><img src= ${data.dp_url}?v=${Date.now()} alt="avatar" class= "groups-avatar-dp" /></div>`;
        } else {
          target_group.src = data.dp_url + `?v=${Date.now()}`;
        }
      }
      document.querySelector(`.group-card[data-id="${groups[index].id}"] .group-name`).textContent = new_group_name;      
      closeModal();
    } else {
      alert("Failed to create group: " + data.message);
    }
  } catch (error) {
    console.error("Error Editing group info:", error);
    alert("An error occurred while creating the group.");
  } finally {
    toggleLoadingAnimation()
  }
}

// Handle Invite Links
async function copyInviteLink(idx) {

  let index;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].id === idx) {
      index = i;
      break;
    }
  }
  
  toggleLoadingAnimation()
  try {
    const response = await fetch(
      `/api/invite-link?group_id=${idx}&group_name=${groups[index].group_name}`,
      {
        method: "GET",
        headers: {
          Authorization: userAuth.session_id || null,
        },
      }
    );

    const data = await response.json();
    if (data.success) {
      const invite_link = window.location.origin + data.invite_link;

      // Ensure the document is focused
      window.focus();

      navigator.clipboard.writeText(invite_link);
      alert("Invite link copied to clipboard!\nInvite link: " + invite_link);

    } else {
      alert("Failed to create group: " + data.message);
    }
  } catch (error) {
    console.error("Error creating group:", error);
    alert("An error occurred while creating the group.");
  } finally {
    toggleLoadingAnimation()
  }
}

// Delete Group
async function deleteGroup(idx) {
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;
  if (!userData) return;

  const sessionID = userData.session_id || null;
  const username = userData.username || null;

  if (!sessionID) {
    alert("Session ID not found.");
    return;
  }

  const base = "/api/delete-group/";
  const url = `${base}`;

  toggleLoadingAnimation();
  try {
    const response = await fetch(url, { method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": sessionID
                    },
                    body: JSON.stringify({ username: username, group_id: idx }) });
    const data = await response.json();

    if (data.success) {
      location.reload();
    } else {
      alert("Failed to delete group: " + data.message);
    }
  } catch (error) {
    console.error("Error deleting group:", error);
    alert("An error occurred while deleting the group.");
  } finally {
    toggleLoadingAnimation();
  }
}

// Leave Group
async function leaveGroup(idx) {
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;
  if (!userData) return;

  const sessionID = userData.session_id || null;
  const username = userData.username || null;

  if (!sessionID) {
    alert("Session ID not found.");
    return;
  }

  const base = "/api/leave-group/";
  const url = `${base}`;

  toggleLoadingAnimation();
  try {
    const response = await fetch(url,
                    { method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": sessionID
                      },
                      body: JSON.stringify({username: username, group_id: idx })
                    });
    const data = await response.json();

    if (data.success) {
      location.reload();
    } else {
      alert("Failed to leave group: " + data.message);
    }
  } catch (error) {
    console.error("Error leaving group:", error);
    alert("An error occurred while leaving the group.");
  } finally {
    toggleLoadingAnimation();
  }
  
}



// Dropdown menu functionality
function addDropdown(rect, idx, pinned, is_admin) {
  let dropdownWrapper = document.querySelector(".dropdown-wrapper");
  dropdownWrapper.childElementCount > 0
    ? (dropdownWrapper.innerHTML = "")
    : null;
  let pin_message = pinned ? "Unpin" : "Pin";

  // console.log(is_admin, userAuth.username);
  let discard_message = (is_admin === userAuth.username)? "Delete" : "Leave";

  let top_pos = rect.top;
  let left_pos = rect.left;

  if (window.innerHeight - top_pos < threshold) {
    top_pos = rect.top - 200;
  }

  if (left_pos - 100 < 0) {
    left_pos = rect.left + 100;
  }

  const element = `<div class="menu-dropdown" data-id=${idx} style="top: ${
    top_pos + 35
  }px; left: ${left_pos - 100}px;">
                      <div class="menu-option" data-type="pin">📌 ${pin_message}</div>
                      <div class="menu-option" data-type="edit">✏️ Edit</div>
                      <div class="menu-option" data-type="invite">👥 Invite</div>
                      <div class="menu-option" data-type="${discard_message.toLowerCase()}">🗑️ ${discard_message}</div>
                    </div>`;

  dropdownWrapper.innerHTML = element;
  let dropdown = document.querySelector(".menu-dropdown");
  dropdown.classList.toggle("active");

  // Dropdown handlers
  document.querySelector(".menu-dropdown").addEventListener("click", async function (e) {
    target = e.target.closest(".menu-option");
    if (target) {
      const type = target.getAttribute("data-type");

      switch (type) {
        case "pin":
          // Handle pin action
          await pinGroup(idx);
          break;
        case "edit":
          await editGroup(idx);
          break;
        case "invite":
          await copyInviteLink(idx);
          break;
        case "delete":
          await deleteGroup(idx);
          break;
        case "leave":
          await leaveGroup(idx);
          break;
        default:
          break;
      }
    }
  });
}
 
// Create group card function with fixed dropdown positioning
const createGroupCard = (group) => {
  const card = document.createElement("div");
  let avatar_element;

  if (group.avatar === null || group.avatar === '') {
    avatar_element = '<div class="fas fa-users group-avatar"></div>';
  } else {
    avatar_element = `<div class="group-avatar"><img src= ${group.avatar}?v=${Date.now()} alt="avatar" class= "groups-avatar-dp" /></div>`;
  }

  card.className = "group-card";
  card.setAttribute("data-id", group.id);
  card.setAttribute("data-name", group.group_name);
  card.innerHTML = `
                  <div class="group-info">
                      ${avatar_element}
                      <div class="group-name">${group.group_name}</div>
                      <div class="pin-mark">${group.pinned ? "📌" : ""}</div>
                  </div>
                  <div class="group-menu">
                      <div class="menu-dots">⋮</div>                    
                  </div>
              `;

  const menuDots = card.querySelector(".menu-dots");

  menuDots.addEventListener("click", (e) => {
    e.stopPropagation();

    // Close dropdown if already open
    const activeDropdown = document.querySelector(".menu-dropdown.active");
    if (activeDropdown) {
      const id = activeDropdown.getAttribute("data-id");
      if (id == group.id) {
        activeDropdown.classList.remove("active");
        return;
      }
    }

    // Position the dropdown relative to the dots
    const rect = menuDots.getBoundingClientRect();
    addDropdown(rect, group.id, group.pinned, group.is_admin);
  });

  return card;
};

// Render groups
async function initGroups () {
  const groupsContainer = document.querySelector(".groups-container");
  await fetchGroups();

  let tempGroups = [];

  groups.forEach((group) => {
    if (group.pinned) {
      tempGroups.unshift(group);
    } else {
      tempGroups.push(group);
    }
  });

  console.log(tempGroups);
  tempGroups.forEach((group) => {
    groupsContainer.appendChild(createGroupCard(group));
  });
  groups = tempGroups;
}

// Search functionality
const searchInput = document.querySelector(".search-input");
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const groupsContainer = document.querySelector(".groups-container");
  groupsContainer.innerHTML = "";
  groups
    .filter((group) => group.group_name.toLowerCase().includes(searchTerm))
    .forEach((group) => {
      groupsContainer.appendChild(createGroupCard(group));
    });
});


async function route2chats(group_id, group_name) {
  const user_id = userAuth.username;
  const sessionID = userAuth.session_id || null;
  const url = `api/route/chats?group_id=${group_id}&group_name=${group_name}&user_id=${user_id}&sessionID=${sessionID}`;

  try{
    window.location.href = url;
  } catch (error) {
    console.error("Failed to route to chats -> Error:", error);
  }

}


groupsContainer.addEventListener("click", (e) => {
  const target = e.target.closest(".group-card");
  if (target) {
    // const id = target.getAttribute("data-id");
    // location.href = `/group/${id}`;
    route2chats(target.getAttribute("data-id"), target.getAttribute("data-name"));
    console.log(target);
  }
});



// Initialize theme when page loads
initializeTheme();
initGroups();





document.querySelector("#profile-pic").addEventListener("click", () => {
  profileDropdown.classList.toggle("active");

  if (profileDropdown.classList.contains("active")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }
});

document.querySelector(".profile-menu").addEventListener("click", (e) => {
  const target = e.target;
  
  if (target.classList.contains("logout")) {
    logout();
  } else if (target.classList.contains("edit-profile")) {
    document.querySelector("#groupName").disabled = true;    
    document.querySelector("#groupName").classList.add("active");
    editProfile();
  }
});



function logout() {
  sessionStorage.removeItem("userData");
  location.href = "/user-validation";
}

async function editProfile() {
  const username = userAuth.username;
  
  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  document.getElementById("groupName").value = username; 
  document.querySelector(".form-group label").innerHTML = "Username";
  document.querySelector(".modal-header h2").textContent = "Edit Profile";
  document.querySelector(".image-label").innerHTML = "Profile Picture";
  document.querySelector(".create-btn").style.display = "none";
  document.querySelector(".edit-btn").style.display = "block";

  const imgElement = document.createElement("img");
  imgElement.src = document.getElementById("profile-pic").src;
  imgElement.alt = "Profile Picture";
  imagePreview.innerHTML = "";
  imagePreview.appendChild(imgElement);

  document.querySelector(".edit-btn").addEventListener("click", wrapper_profile);
}

async function wrapper_profile () {
  await updateUserProfile(userAuth.username);
}

async function updateUserProfile(username) {
  let changes = false;

  const formData = new FormData();
  formData.append("old_username", username);

  if (username !== document.getElementById("groupName").value) {
    formData.append("new_username", document.getElementById("groupName").value);
    changes = true;
  }
  if (fileInput.files[0]) {
    formData.append("profile_pic", fileInput.files[0]);
    changes = true;
  }

  if (!changes) {
    closeModal();
    return;
  }

  toggleLoadingAnimation();
  try {
    const response = await fetch("/api/update-user-info/", {
      method: "POST",
      headers: {
        Authorization: userAuth.session_id || null,
      },
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      
      if (fileInput.files[0]) {
        document.getElementById("profile-pic").src = data.dp_url + "?v=" + Date.now();
      }
      document.querySelector(".nav-icon.profile").innerHTML = data.username;
      sessionStorage.setItem("userData", JSON.stringify(
        {
          username: data.username,
          sessionID: userAuth.session_id
        }
      ));
      userAuth = {
        username: data.username,
        sessionID: userAuth.session_id,
      };
      
      closeModal();
    } else {
      alert("Failed to edit profile: " + data.message);
    }
  } catch (error) {
    console.error("Error creating profile:", error);
    alert("An error occurred while editing profile.");
  } finally {
    toggleLoadingAnimation();
    document.querySelector(".edit-btn").removeEventListener("click", wrapper_profile);
  }
}



// Modal Elements
const createGroupBtn = document.querySelector(".create-group-btn");
const modal = document.querySelector("#createGroupModal");
const modalOverlay = modal.querySelector(".modal-overlay");
const closeModalBtn = modal.querySelector(".close-modal");
const createBtn = modal.querySelector(".create-btn");
const uploadBtn = modal.querySelector(".upload-btn");
const fileInput = document.querySelector("#groupImage");
const imagePreview = document.querySelector(".image-preview");

let croppedImage = null;

function addDefaultDp() {
  const dp = document.createElement("i");
  dp.classList.add("fas", "fa-users", "default-avatar");
  imagePreview.innerHTML = "";
  imagePreview.appendChild(dp);
}


// Open modal
createGroupBtn.addEventListener("click", () => {
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  document.getElementById("groupName").disabled = false;
  document.querySelector("#groupName").classList.remove("active");
  addDefaultDp();
});

// Close modal handlers
const closeModal = () => {
  modal.classList.remove("active");
  document.body.style.overflow = "unset";
  document.querySelector("#groupName").value = ""; 
  document.getElementById("groupName").disabled = false;
  document.querySelector("#groupName").classList.toggle("active");
  document.querySelector(".form-group label").innerHTML = "Group Name";
  document.querySelector(".modal-header h2").textContent = "Create Group";
  document.querySelector(".create-btn").textContent = "Create Group";
  document.querySelector(".image-label").innerHTML = "Group Picture";
  imagePreview.innerHTML = "";
  croppedImage = null;
};

[closeModalBtn, modalOverlay].forEach((elem) => {
  elem.addEventListener("click", closeModal);
});

// Stop propagation on modal content
modal.querySelector(".modal-content").addEventListener("click", (e) => {
  e.stopPropagation();
});


async function updateGroupDatabase(groupName, avatar) {
  const userData = JSON.parse(sessionStorage.getItem("userData")) || null;

  
  const formData = new FormData();
  formData.append("username", userData.username);
  formData.append("group_name", groupName);
  formData.append("group_avatar", avatar);
  formData.append("admin", userData.username);
  formData.append("pinned", false);

  toggleLoadingAnimation();
  try {
    const response = await fetch("/api/update-group/", {
      method: "POST",
      headers: {
        Authorization: userAuth.session_id || null,
      },
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      const newGroup = {
        id: data.group_id,
        group_name: groupName,
        avatar: data.dp_url,
      };

      const newCard = createGroupCard(newGroup);
      groups.push(newGroup);
      document.querySelector(".groups-container").appendChild(newCard);
      closeModal();


    } else {
      alert("Failed to create group: " + data.message);
    }
  } catch (error) {
    console.error("Error creating group:", error);
    alert("An error occurred while creating the group.");
  } finally {
    toggleLoadingAnimation();
  }
}


// Create group handler
createBtn.addEventListener("click", () => {
  const groupName = document.querySelector("#groupName").value.trim();
  let avatar = fileInput.files[0];

  if (!avatar) avatar = null;
  if (!groupName) {
    alert("Please enter a group name");
    return;
  }

  imagePreview.innerHTML = '';
  updateGroupDatabase(groupName, avatar);
});

// Image upload and cropping
uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = document.createElement("img");
      imgElement.src = e.target.result;
      imgElement.alt = "Group Picture";
      imagePreview.innerHTML = "";
      imagePreview.appendChild(imgElement);
    }
    reader.readAsDataURL(file);
  }
});