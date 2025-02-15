from os import getenv, path, environ
from icecream import ic
from dotenv import load_dotenv
import google.generativeai as genai
from asyncio import run

load_dotenv()
genai.configure(api_key= environ.get("GEMINI_API_KEY"))

class Aarna:
    def __init__(self, model_v: str = 'gemini-1.5-flash', system_instruct: str = 'aarna.txt'):
        self.model = genai.GenerativeModel(
            model_name= model_v,
            system_instruction= self.read_persona(system_instruct)
        )

    def read_persona(self, avatar: str) -> str:
        with open(f"static/persona/{avatar}", 'r', encoding= "utf-8") as persona:
            return persona.read()

    async def get_response(self, prompt: str) -> str|None:
        response = self.model.generate_content(prompt).text
        return response
    
 

if __name__ == "__main__":
    model = Aarna()

    async def main():
        while True:
            prompt = input("You: ")
            if prompt.lower() == "quit":
                break

            response = await model.get_response(prompt)
            print(response)

    run(main())