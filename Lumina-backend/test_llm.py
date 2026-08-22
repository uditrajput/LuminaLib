import asyncio
from luminalib.infrastructure.llm.llm_factory import get_llm_provider
from luminalib.core.dynamic_config import init_db_config

async def main():
    await init_db_config()
    llm = await get_llm_provider()
    print("Provider:", type(llm))
    
    question = "ask me multiple choice questions"
    context = ""
    system_prompt = (
        "You are LuminaLib's intelligent AI assistant. "
        "Answer the user's question directly, accurately, and concisely. "
        "When the user asks to be asked questions on a topic (e.g. 'ask me questions on X', 'ask me a question on Y', or 'generate questions on Z'), you MUST provide the most frequently asked, high-yield exam and interview questions on that specific topic. "
        "When asked for a table or tabular format, you MUST format the response strictly as a standard Markdown table with complete opening and closing pipes for all columns (e.g. | # | Question |). "
        "Do not repeat the user's question, prompt headers, or prefixes in your answer."
    )
    user_prompt = f"Question: {question}\n\nAnswer:"
    
    if hasattr(llm, "_call"):
        raw_answer = await llm._call(system_prompt=system_prompt, user_prompt=user_prompt)
    else:
        raw_answer = await llm.summarize(f"{system_prompt}\n\n{user_prompt}")
    
    print("RAW ANSWER:", repr(raw_answer))
    
    import re
    cleaned = re.sub(r"^(the\s+)?(user\s+input|question):\s*.*?\n+", "", raw_answer, flags=re.IGNORECASE).strip()
    cleaned = cleaned.replace("**", "")
    final_answer = cleaned if cleaned else raw_answer.replace("**", "")
    
    print("FINAL ANSWER:", repr(final_answer))

if __name__ == "__main__":
    asyncio.run(main())
