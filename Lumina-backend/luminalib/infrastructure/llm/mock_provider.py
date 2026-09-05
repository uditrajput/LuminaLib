"""Mock LLM provider for development and testing."""

from __future__ import annotations

import logging

logger = logging.getLogger("luminalib.llm.mock")


class MockProvider:
    """Returns deterministic mock responses — no external API calls."""

    async def summarize(self, content: str) -> str:
        snippet = content.strip().replace("\n", " ")[:240]
        logger.debug("Mock summarize called (content length=%d)", len(content))
        return f"Summary: {snippet}"

    async def analyze_review(self, content: str) -> str:
        snippet = content.strip().replace("\n", " ")[:240]
        logger.debug("Mock analyze_review called (content length=%d)", len(content))
        return f"Consensus: {snippet}"

    async def generate(self, prompt: str, system_prompt: str = "You are a helpful AI study assistant.") -> str:
        import json
        import random
        logger.debug("Mock generate called")
        prompt_lower = prompt.lower()
        
        is_sanskrit = "sanskrit" in prompt_lower or "संस्कृत" in prompt or "श्लोक" in prompt
        is_hindi = ("hindi" in prompt_lower or "हिन्दी" in prompt or "हिंदी" in prompt) and not is_sanskrit
        
        if "flashcard" in prompt_lower:
            if is_sanskrit:
                flashcard_pool = [
                    {"front": "सत्यं वद धर्मं चर इत्यस्य कः अभिप्रायः?", "back": "सत्यभाषणं धर्मपालनं च मानवजीवनस्य परमं कर्तव्यं वर्तते।"},
                    {"front": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन कस्य ग्रंथस्य वचनम्?", "back": "श्रीमद्भगवद्गीतायाः द्वितीयोध्यायस्य निष्कामकर्मयोगस्य उपदेशः।"},
                    {"front": "विद्या ददाति विनयं इति श्लोकांशस्य तात्पर्यं किम्?", "back": "सच्ची विद्या मनुष्यं विनम्रं करोति, विनयाच्च पात्रता प्राप्यते।"},
                    {"front": "संस्कृतव्याकरणे कति माहेश्वरसूत्राणि सन्ति?", "back": "संस्कृतव्याकरणे चतुर्दश (१४) माहेश्वरसूत्राणि सन्ति।"},
                    {"front": "संधेः कति प्रमुखाः भेदाः भवन्ति?", "back": "संधेः त्रयः प्रमुखाः भेदाः सन्ति — स्वरसंधिः (अच्), व्यंजनसंधिः (हल्), विसर्गसंधिः च।"},
                ]
            elif is_hindi:
                flashcard_pool = [
                    {"front": "संधि और समास में मुख्य अंतर क्या है?", "back": "संधि दो वर्णों के मेल से होने वाला विकार है, जबकि समास दो या दो से अधिक शब्दों का मेल है।"},
                    {"front": "संज्ञा और सर्वनाम की क्या परिभाषा है?", "back": "किसी व्यक्ति, वस्तु, स्थान या भाव के नाम को संज्ञा कहते हैं, तथा संज्ञा के स्थान पर प्रयुक्त होने वाले शब्द सर्वनाम कहलाते हैं।"},
                    {"front": "क्रिया के कितने प्रमुख भेद होते हैं?", "back": "कर्म के आधार पर क्रिया के दो मुख्य भेद होते हैं — सकर्मक क्रिया और अकर्मक क्रिया।"},
                    {"front": "अलंकार किसे कहते हैं और इसके प्रमुख प्रकार क्या हैं?", "back": "काव्य की शोभा बढ़ाने वाले तत्व अलंकार कहलाते हैं। इसके दो मुख्य भेद हैं — शब्दालंकार और अर्थालंकार।"},
                    {"front": "मुहावरे और लोकोक्ति में क्या अंतर है?", "back": "मुहावरा एक वाक्यांश होता है जो वाक्य में प्रयुक्त होता है, जबकि लोकोक्ति अपने आप में एक पूर्ण वाक्य होती है।"},
                ]
            else:
                flashcard_pool = [
                    {"front": "What is the primary role of indexOf() in string search operations?", "back": "It returns the index of the first occurrence of the specified character or substring, scanning forward."},
                    {"front": "How does lastIndexOf() differ from standard indexOf()?", "back": "lastIndexOf() scans backward from the end or from a specified startIndex, returning the last occurrence index."},
                    {"front": "What integer value is returned if a searched character or substring is not found?", "back": "It returns -1 to signify absence of the target sequence."},
                    {"front": "What does the startIndex parameter specify in string searching methods?", "back": "It sets the starting boundary index from which the search begins executing."},
                    {"front": "Why is string immutability significant in memory management?", "back": "It enables string pooling, thread safety, and secure hashing."},
                    {"front": "What occurs when startIndex exceeds the string length in indexOf()?", "back": "The method safely returns -1 as no characters remain to search."},
                    {"front": "How does StringBuilder provide performance benefits over String concatenation?", "back": "StringBuilder uses a mutable character buffer, avoiding intermediate heap allocations."},
                    {"front": "What is the primary difference between checked and unchecked exceptions?", "back": "Checked exceptions are verified at compile time, whereas unchecked exceptions occur at runtime."}
                ]
            selected = random.sample(flashcard_pool, min(5, len(flashcard_pool)))
            return json.dumps(selected)

        if "mcq" in prompt_lower:
            if is_sanskrit:
                mcq_pool = [
                    {
                        "question": "श्रीमद्भगवद्गीता कस्मिन् महाकाव्ये समाविष्टा अस्ति?",
                        "correct": "महाभारते",
                        "distractors": ["रामायणे", "रघुवंशे", "मेघदूते"],
                        "explanation": "श्रीमद्भगवद्गीता महाभारतस्य भीष्मपर्वणि समाविष्टा अस्ति।"
                    },
                    {
                        "question": "माहेश्वरसूत्राणां संख्या कति वर्तते?",
                        "correct": "चतुर्दश (१४)",
                        "distractors": ["दश (१०)", "द्वादश (१२)", "षोडश (१६)"],
                        "explanation": "पाणिनीयव्याकरणे चतुर्दश माहेश्वरसूत्राणि सन्ति।"
                    },
                    {
                        "question": "'सत्यमेव जयते' इति वाक्यं कस्मात् उपनिषदः उद्धृतम्?",
                        "correct": "मुण्डकोपनिषदः",
                        "distractors": ["कठोपनिषदः", "केनॊपनिषदः", "प्रश्नोपनिषदः"],
                        "explanation": "इदं प्रसिद्धं वचनं मुण्डकोपनिषदः ३.१.६ सूक्तात् गृहीतम्।"
                    },
                    {
                        "question": "संस्कृते कति विभक्तयः सन्ति?",
                        "correct": "सप्त (७)",
                        "distractors": ["पञ्च (५)", "अष्ट (८)", "नव (९)"],
                        "explanation": "संस्कृते प्रथमातः सप्तमीपर्यन्तं सप्त विभक्तयः भवन्ति।"
                    }
                ]
            elif is_hindi:
                mcq_pool = [
                    {
                        "question": "हिंदी भाषा की लिपि कौन सी है?",
                        "correct": "देवनागरी",
                        "distractors": ["रोमन", "गुरुमुखी", "फारसी"],
                        "explanation": "हिंदी भाषा देवनागरी लिपि में लिखी जाती है।"
                    },
                    {
                        "question": "दो स्वरों के मेल से होने वाले परिवर्तन को क्या कहते हैं?",
                        "correct": "स्वर संधि",
                        "distractors": ["व्यंजन संधि", "विसर्ग संधि", "तत्पुरुष समास"],
                        "explanation": "दो स्वरों के परस्पर मेल से उत्पन्न विकार को स्वर संधि कहते हैं।"
                    },
                    {
                        "question": "क्रिया के मूल रूप को क्या कहा जाता है?",
                        "correct": "धातु",
                        "distractors": ["कारक", "अव्यय", "प्रत्यय"],
                        "explanation": "क्रिया के मूल अंश या रूप को धातु कहते हैं, जैसे - पढ़, लिख।"
                    },
                    {
                        "question": "जिस समास में दोनों पद प्रधान होते हैं, उसे क्या कहते हैं?",
                        "correct": "द्वंद्व समास",
                        "distractors": ["द्विगु समास", "अव्ययीभाव समास", "बहुव्रीहि समास"],
                        "explanation": "द्वंद्व समास में पूर्वपद और उत्तरपद दोनों ही समान रूप से प्रधान होते हैं (जैसे - माता-पिता)।"
                    }
                ]
            else:
                mcq_pool = [
                    {
                        "question": "What is the return value of indexOf() when the character or substring does not exist in the string?",
                        "correct": "-1",
                        "distractors": ["0", "null", "StringIndexOutOfBoundsException"],
                        "explanation": "indexOf() returns -1 whenever the target character or substring is absent."
                    },
                    {
                        "question": "From which direction does lastIndexOf(str, startIndex) perform its search?",
                        "correct": "Backward starting from startIndex toward index 0",
                        "distractors": ["Forward starting from startIndex toward the end", "From the center outward in both directions", "Randomized non-linear indexing"],
                        "explanation": "lastIndexOf() scans backward toward the beginning of the string."
                    },
                    {
                        "question": "What is the function of the startIndex parameter in indexOf()?",
                        "correct": "It specifies the index offset from which the search starts scanning forward",
                        "distractors": ["It truncates the original string permanently", "It sets the maximum length limit of the return array", "It converts the string to uppercase"],
                        "explanation": "startIndex defines the initial position where the search operation begins."
                    },
                    {
                        "question": "Which of the following is a primary advantage of String immutability?",
                        "correct": "Thread-safety and sharing via the String Constant Pool",
                        "distractors": ["Allowing direct in-place byte mutation", "Bypassing garbage collection permanently", "Eliminating memory usage entirely"],
                        "explanation": "Immutable strings can be safely shared across concurrent threads without synchronization."
                    },
                    {
                        "question": "How does StringBuilder differ from String in performance?",
                        "correct": "StringBuilder uses a mutable internal buffer, avoiding repeated object creation",
                        "distractors": ["StringBuilder is strictly immutable and thread-locked", "StringBuilder cannot store Unicode characters", "StringBuilder allocates new strings on every append"],
                        "explanation": "StringBuilder modifies its buffer in place, providing superior performance in loops."
                    },
                    {
                        "question": "What happens if startIndex is negative in indexOf(char, startIndex)?",
                        "correct": "It is treated as 0, scanning the entire string from the beginning",
                        "distractors": ["It throws an immediate NullPointerException", "It halts the JVM runtime process", "It scans in reverse direction"],
                        "explanation": "Negative startIndex in indexOf is treated as index 0."
                    }
                ]
            
            chosen = random.sample(mcq_pool, min(5, len(mcq_pool)))
            mcqs = []
            for item in chosen:
                options = [item["correct"]] + item["distractors"]
                random.shuffle(options)
                ans_idx = options.index(item["correct"])
                mcqs.append({
                    "question": item["question"],
                    "options": options,
                    "answer": ans_idx,
                    "explanation": item["explanation"]
                })
            return json.dumps(mcqs)

        if "mindmap" in prompt_lower:
            if is_sanskrit:
                branches = [
                    {"name": "मूलसिद्धान्ताः", "children": ["परिभाषा", "शास्त्रप्रमाणम्", "मूलसंकल्पनाः", "उद्देश्यम्"]},
                    {"name": "प्रयोगविधिः", "children": ["व्याकरणनियमाः", "पदसंरचना", "उदाहरणानि", "प्रयोगाः"]},
                    {"name": "प्रमुखप्रक्रिया", "children": ["अध्ययनक्रमः", "सूत्राणि", "विस्तारः", "समीक्षा"]},
                    {"name": "परीक्षणम् च मूल्याङ्कनम्", "children": ["अभ्यासः", "प्रश्नोत्तराणि", "निष्कर्षः"]},
                ]
                root_name = "संस्कृत अध्ययन मार्गदर्शिका"
            elif is_hindi:
                branches = [
                    {"name": "मूल सिद्धांत", "children": ["परिभाषाएं", "सैद्धांतिक ढांचा", "आधारभूत नियम", "उद्देश्य"]},
                    {"name": "व्यावहारिक विधि", "children": ["चरणबद्ध प्रक्रिया", "कार्यान्वयन नियम", "उदाहरण", "केस स्टडी"]},
                    {"name": "मुख्य प्रक्रिया", "children": ["कार्यप्रणाली", "पैरामीटर नियंत्रण", "दक्षता एवं अनुकूलन"]},
                    {"name": "परीक्षण एवं मूल्यांकन", "children": ["त्रुटि निवारण", "सीमाएं", "अभ्यास एवं निष्कर्ष"]},
                ]
                root_name = "हिंदी अध्ययन मार्गदर्शिका"
            else:
                branches = [
                    {"name": "Strings & Methods", "children": ["indexOf() & lastIndexOf()", "startIndex Offset Search", "Immutability & Memory", "StringBuilder Utility"]},
                    {"name": "Exception Handling", "children": ["try-catch-finally", "Checked vs Unchecked", "Custom Exceptions", "AutoCloseable"]},
                    {"name": "Object-Oriented Design", "children": ["Encapsulation", "Inheritance & Polymorphism", "Abstraction & Interfaces", "Class Modifiers"]},
                    {"name": "JVM & Runtime", "children": ["Heap & Stack Allocation", "Garbage Collection Cycles", "ClassLoaders", "JIT Compiler"]},
                    {"name": "Collections & Generics", "children": ["List, Set, & Map Hierarchy", "ArrayList vs LinkedList", "HashMap Hashing", "Iterators"]},
                    {"name": "Concurrency & Multithreading", "children": ["Thread Lifecycle", "Synchronized & Locks", "Executors & ThreadPools", "Volatile & Atomic"]},
                ]
                root_name = "Core Study Guide"

            return json.dumps({
                "root": root_name,
                "branches": random.sample(branches, min(5, len(branches))),
                "mermaid": f"mindmap\n  root(({root_name}))\n    Branch1\n    Branch2"
            })

        if "summary" in prompt_lower:
            if is_sanskrit:
                summary_pool = [
                    "संस्कृतसाहित्ये ज्ञानविज्ञानयोः समन्वयः परमं वैशिष्ट्यं वर्तते।",
                    "व्याकरणनियमाः भाषायाः शुद्धतां सौन्दर्यं च संरक्षन्ति।",
                    "सदाचारः, कर्तव्यपालनं, विद्याभ्यासः च मानवजीवनस्य त्रयः स्तम्भाः सन्ति।",
                    "समग्रमपि अध्ययनं वैचारिकशुद्धये आत्मविकासाय च कल्पते।"
                ]
                return json.dumps({
                    "summary": "अस्मिन् पाठ्यभागे संस्कृतसाहित्यस्य, दर्शनस्य, व्याकरणनियमानां च गहनं विवेचनं विद्यते।",
                    "bullets": random.sample(summary_pool, min(4, len(summary_pool)))
                })
            elif is_hindi:
                summary_pool = [
                    "आधारभूत सिद्धांतों का अध्ययन वैचारिक स्पष्टता और तार्किक दृष्टिकोण को सुदृढ़ करता है।",
                    "व्यवस्थित प्रक्रिया और चरणबद्ध पद्धति जटिल समस्याओं के समाधान में सहायक होती है।",
                    "व्याकरण और भाषा के शुद्ध नियमों का पालन संचार को अधिक प्रभावी बनाता है।",
                    "नियमित अभ्यास और सतत मूल्यांकन से विषय पर पूर्ण अधिकार प्राप्त होता है।"
                ]
                return json.dumps({
                    "summary": "यह अध्ययन मॉड्यूल आधारभूत संकल्पनाओं, व्यवस्थित कार्यप्रणाली और व्यावहारिक प्रयोगों का विस्तृत और प्रामाणिक विश्लेषण प्रस्तुत करता है।",
                    "bullets": random.sample(summary_pool, min(4, len(summary_pool)))
                })
            else:
                summary_pool = [
                    "String searching methods such as indexOf() and lastIndexOf() provide indexed lookups with directional scanning and boundary constraints.",
                    "Immutability in foundational object models guarantees thread safety and optimized memory pooling across concurrent workflows.",
                    "Specifying startIndex boundary parameters allows precise range searches and prevents redundant traversal over previously parsed substrings.",
                    "Decomposing complex structures into modular, well-tested components significantly reduces runtime exceptions and boundary errors."
                ]
                return json.dumps({
                    "summary": "This study module explores essential programming and architectural principles, focusing on directional search algorithms, memory immutability, and boundary-safe execution.",
                    "bullets": random.sample(summary_pool, min(4, len(summary_pool)))
                })

        return "Generated response based on provided context."
