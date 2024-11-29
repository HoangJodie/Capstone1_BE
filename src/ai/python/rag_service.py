from openai import OpenAI
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
import os
import sys
import json
import argparse
from web_crawler import crawl_website

# Biến global để lưu cache
_vectorstore_cache = None

def init_ai():
    client = OpenAI(
        base_url="http://localhost:11434/v1",
        api_key="ollama",
    )
    return client

def load_documents():
    try:
        global _vectorstore_cache
        
        # Nếu đã có cache, trả về luôn
        if _vectorstore_cache is not None:
            print("Sử dụng vectorstore từ memory cache...", file=sys.stderr)
            return _vectorstore_cache
            
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        documents_dir = os.path.join(base_dir, 'documents')
        crawled_data_dir = os.path.join(documents_dir, 'crawled_data')
        db_path = os.path.join(base_dir, 'chroma_db')
        
        # Kiểm tra xem có vectorstore cache trong disk không
        if os.path.exists(db_path):
            print("Đang load vectorstore từ disk cache...", file=sys.stderr)
            embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )
            _vectorstore_cache = Chroma(
                persist_directory=db_path,
                embedding_function=embeddings
            )
            return _vectorstore_cache
            
        print(f"Loading documents from: {documents_dir}", file=sys.stderr)
        
        # Tạo các thư mục nếu chưa tồn tại
        os.makedirs(documents_dir, exist_ok=True)
        os.makedirs(crawled_data_dir, exist_ok=True)
        
        # Load documents từ cả hai thư mục riêng biệt
        documents = []
        
        # Load từ thư mục documents gốc
        main_loader = DirectoryLoader(
            documents_dir,
            glob="*.txt",  # Chỉ load file trực tiếp trong thư mục documents
            loader_cls=TextLoader,
            loader_kwargs={'encoding': 'utf-8'}
        )
        documents.extend(main_loader.load())
        
        # Load từ thư mục crawled_data
        crawled_loader = DirectoryLoader(
            crawled_data_dir,
            glob="*.txt",
            loader_cls=TextLoader,
            loader_kwargs={'encoding': 'utf-8'}
        )
        crawled_docs = crawled_loader.load()
        
        # In ra các file đã load để debug
        print("Loaded files:", file=sys.stderr)
        for doc in documents:
            print(f"- {doc.metadata['source']}", file=sys.stderr)
        for doc in crawled_docs:
            print(f"- {doc.metadata['source']}", file=sys.stderr)
            
        documents.extend(crawled_docs)
        
        if not documents:
            raise Exception(f"Không tìm thấy tài liệu trong thư mục {documents_dir}")
        
        # Tăng chunk_size lớn hơn và điều chỉnh cách split
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,  # Tăng lên 4000 ký tự
            chunk_overlap=400,  # Tăng overlap để đảm bảo không mất context
            length_function=len,
            separators=["\n\n\n", "\n\n", "\n", ".", " ", ""],  # Thêm nhiều separators
            is_separator_regex=False
        )
        
        # In nội dung gốc để debug
        print("\nNội dung gốc của các file:", file=sys.stderr)
        for doc in documents:
            print(f"\nFile: {doc.metadata['source']}", file=sys.stderr)
            print(f"Độ dài nội dung: {len(doc.page_content)}", file=sys.stderr)
            print(f"Vài dòng đầu:\n{doc.page_content[:500]}...\n", file=sys.stderr)
        
        texts = text_splitter.split_documents(documents)
        
        print(f"\nSố lượng chunks sau khi split: {len(texts)}", file=sys.stderr)
        print("\nKiểm tra các chunks:", file=sys.stderr)
        for i, text in enumerate(texts):
            print(f"\nChunk {i+1}:", file=sys.stderr)
            print(f"Source: {text.metadata['source']}", file=sys.stderr)
            print(f"Độ dài chunk: {len(text.page_content)}", file=sys.stderr)
            print(f"Nội dung: {text.page_content[:200]}...", file=sys.stderr)
        
        # Kiểm tra xem có chunk nào quá ngắn không
        short_chunks = [text for text in texts if len(text.page_content) < 100]
        if short_chunks:
            print(f"\nCảnh báo: Có {len(short_chunks)} chunks quá ngắn!", file=sys.stderr)
        
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        
        # Xóa db cũ
        if os.path.exists(db_path):
            import shutil
            shutil.rmtree(db_path)
        
        # Tạo vectorstore với số lượng vectors phù hợp
        vectorstore = Chroma.from_documents(
            documents=texts,
            embedding=embeddings,
            persist_directory=db_path
        )
        vectorstore.persist()  # Lưu vectorstore
        print("\nĐã tạo và cache vectorstore", file=sys.stderr)
        _vectorstore_cache = vectorstore
        return vectorstore
        
    except Exception as e:
        print(f"Lỗi khi đọc tài liệu: {str(e)}", file=sys.stderr)
        return None

def clear_vectorstore_cache():
    global _vectorstore_cache
    _vectorstore_cache = None

def get_response(query, conversation_history=None, stream=False):
    try:
        client = init_ai()
        
        # Xem xét context hội thoại
        conversation_context = ""
        current_topic = None
        latest_topic = None
        
        if conversation_history:
            # Lấy tin nhắn mới nhất trước
            latest_message = conversation_history[-1]
            if latest_message['role'] == 'assistant':
                # Phân tích chủ đề từ tin nhắn mới nhất
                if 'gói tập' in latest_message['content'].lower() or 'plan' in latest_message['content'].lower():
                    latest_topic = 'membership'
                elif 'lớp' in latest_message['content'].lower() or 'lịch học' in latest_message['content'].lower():
                    latest_topic = 'classes'
                elif 'huấn luyện viên' in latest_message['content'].lower() or 'pt' in latest_message['content'].lower():
                    latest_topic = 'instructors'
                elif 'bài tập' in latest_message['content'].lower() or 'hướng dẫn tập' in latest_message['content'].lower():
                    latest_topic = 'practice'
            
            # Nếu câu hỏi không rõ ràng, xem xét thêm lịch sử
            if not any(keyword in query.lower() for keyword in ['lớp', 'pt', 'gói', 'bài tập', 'huấn luyện']):
                # Xem 3 tin nhắn gần nhất
                recent_messages = conversation_history[-3:]
                for msg in recent_messages:
                    if msg['role'] == 'assistant':
                        if 'gói tập' in msg['content'].lower() or 'plan' in msg['content'].lower():
                            current_topic = 'membership'
                        elif 'lớp' in msg['content'].lower() or 'lịch học' in msg['content'].lower():
                            current_topic = 'classes'
                        elif 'huấn luyện viên' in msg['content'].lower() or 'pt' in msg['content'].lower():
                            current_topic = 'instructors'
                        elif 'bài tập' in msg['content'].lower() or 'hướng dẫn tập' in msg['content'].lower():
                            current_topic = 'practice'
                    conversation_context += f"{msg['role']}: {msg['content']}\n"
        
        print(f"Context hội thoại:\n{conversation_context}", file=sys.stderr)
        print(f"Chủ đề từ tin nhắn mới nhất: {latest_topic}", file=sys.stderr)
        print(f"Chủ đề từ lịch sử: {current_topic}", file=sys.stderr)
        
        # Ưu tiên chủ đề từ tin nhắn mới nhất
        if latest_topic:
            current_topic = latest_topic
        
        # Phân tích route với context hội thoại
        analysis_prompt = {
            "role": "user",
            "content": f"""Phân tích câu hỏi sau trong context hội thoại:

Câu hỏi hiện tại: "{query}"

Context hội thoại:
{conversation_context}

Chủ đề hiện tại: {current_topic}

Hãy phân tích:
1. Nếu câu hỏi bắt đầu bằng "how", "how to", "cách", "làm sao", "hướng dẫn" -> guide

2. Nếu không phải câu hỏi dạng hướng dẫn, phân loại theo:
   - Lớp học, lịch học -> classes
   - Bài tập, hướng dẫn tập -> practice  
   - PT, huấn luyện viên -> instructors
   - Gói tập, membership, giá -> membership
   - Không liên quan -> none
   - Thông tin chung về gym -> gym_info

Ví dụ:
- "How to register?" -> guide
- "How to book a class?" -> guide
- "Cách đăng ký tài khoản" -> guide
- "Hướng dẫn đặt lịch" -> guide
- "Làm sao để thanh toán" -> guide
- "Show me the classes" -> classes
- "Tell me about membership" -> membership

Chỉ trả lời tên route phù hợp nhất."""
        }
        
        messages = [{
            "role": "system", 
            "content": """Bạn là trợ lý phân tích câu hỏi. 
            1. Ưu tiên giữ nguyên chủ đề nếu câu hỏi yêu cầu thêm thông tin
            2. Chuyển chủ đề nếu câu hỏi rõ ràng về chủ đề mới
            3. Chỉ trả lời none khi chắc chắn không liên quan đến các chủ đề"""
        }]
        
        messages.append(analysis_prompt)
        analysis = client.chat.completions.create(
            model="gemma2:9b",
            messages=messages,
            temperature=0,
            max_tokens=10
        )
        
        route = analysis.choices[0].message.content.strip().lower()
        print(f"Phân tích route: {route}", file=sys.stderr)
        
        # Nếu câu hỏi yêu cầu thêm thông tin và có chủ đề hiện tại
        if route == "none" and current_topic and any(phrase in query.lower() for phrase in 
            ["chi tiết", "thêm", "cụ thể", "nữa", "còn gì", "như thế nào"]):
            route = current_topic
            print(f"Đã cập nhật route theo context: {route}", file=sys.stderr)
        
        # Load documents hiện có trước
        vectorstore = load_documents()
        if vectorstore is None:
            error_msg = {"type": "error", "content": "Không tìm thấy tài liệu"}
            if stream:
                print(json.dumps(error_msg))
                sys.stdout.flush()
                return
            return json.dumps(error_msg)
            
        # Chỉ xóa cache khi có crawl dữ liệu mới
        if route in ["classes", "practice", "instructors", "membership"]:
            docs = vectorstore.similarity_search(query, k=5)
            route_docs = [doc for doc in docs if route in str(doc.metadata.get("source", "")).lower()]
            
            if not route_docs:  # Nếu chưa có dữ liệu của route này
                print(f"Tiến hành crawl route: {route}", file=sys.stderr)
                crawl_success = crawl_website(route)
                if crawl_success:
                    # Xóa cả memory cache và disk cache
                    clear_vectorstore_cache()
                    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'chroma_db')
                    if os.path.exists(db_path):
                        import shutil
                        shutil.rmtree(db_path)
                    vectorstore = load_documents()
        
        # Tìm kiếm với k=5 để có nhiều context hơn
        docs = vectorstore.similarity_search(query, k=5)
        
        # Xử lý context dựa trên route
        if route != "none":
            # Nếu là route cụ thể, ưu tiên tìm trong file tương ứng
            relevant_docs = [
                doc for doc in docs 
                if route in str(doc.metadata.get("source", "")).lower()
            ]
            
            # Nếu không tìm thấy trong route hiện tại, tìm ở các route khác
            if not relevant_docs:
                print(f"Không tìm thấy thông tin trong {route}, tìm kiếm ở các route khác...", file=sys.stderr)
                # Thử tìm trong các route khác
                other_routes = ["classes", "practice", "instructors", "membership"]
                other_routes.remove(route)
                
                for other_route in other_routes:
                    other_docs = [
                        doc for doc in docs 
                        if other_route in str(doc.metadata.get("source", "")).lower()
                    ]
                    if other_docs:
                        print(f"Tìm thấy thông tin liên quan trong route: {other_route}", file=sys.stderr)
                        relevant_docs.extend(other_docs)
                
                # Thêm cả thông tin từ gym_info.txt
                gym_info_docs = [
                    doc for doc in docs 
                    if "gym_info.txt" in str(doc.metadata.get("source", "")).lower()
                ]
                if gym_info_docs:
                    relevant_docs.extend(gym_info_docs)
            
            if relevant_docs:
                docs = relevant_docs
        else:
            # Nếu là câu hỏi chung (route=none), ưu tiên tìm trong gym_info.txt
            gym_info_docs = [
                doc for doc in docs 
                if "gym_info.txt" in str(doc.metadata.get("source", "")).lower()
            ]
            if gym_info_docs:
                docs = gym_info_docs
        
        context = "\n".join([doc.page_content for doc in docs])
        print(f"Context tìm được:\n{context}", file=sys.stderr)
        
        # Cải thiện system prompt
        messages = [{
            "role": "system",
            "content": """Bạn là trợ lý AI của phòng gym FlexFit. Trả lời:
            1. Ngắn gọn, đi thẳng vào vấn đề
            2. Chỉ dùng thông tin từ context
            3. Nói rõ nếu không có thông tin"""
        }]
        
        # Thêm lịch sử hội thoại nếu có
        if conversation_history:
            for msg in conversation_history[-3:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Tạo prompt cuối cùng với context
        final_prompt = f"""Dựa trên thông tin sau:
        {context}
        
        Hãy trả lời câu hỏi: {query}
        
        Lưu ý: Chỉ trả lời dựa trên thông tin có trong context. Nếu không có thông tin, hãy nói rõ."""
        
        messages.append({
            "role": "user",
            "content": final_prompt
        })
        
        try:
            response = client.chat.completions.create(
                model="gemma2:2b",
                messages=messages,
                stream=stream,
                temperature=0.7,
                max_tokens=1000
            )
            
            if stream:
                print(json.dumps({
                    "type": "context",
                    "content": context
                }))
                sys.stdout.flush()
                
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        print(json.dumps({
                            "type": "token",
                            "content": chunk.choices[0].delta.content
                        }))
                        sys.stdout.flush()
            else:
                return json.dumps({
                    "response": response.choices[0].message.content,
                    "context": context
                })
                
        except Exception as e:
            error_msg = {"type": "error", "content": f"AI Error: {str(e)}"}
            if stream:
                print(json.dumps(error_msg))
                sys.stdout.flush()
                return
            return json.dumps(error_msg)
            
    except Exception as e:
        error_msg = {"type": "error", "content": f"System Error: {str(e)}"}
        if stream:
            print(json.dumps(error_msg))
            sys.stdout.flush()
            return
        return json.dumps(error_msg)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="Input query")
    parser.add_argument("--stream", type=bool, default=False, help="Enable streaming")
    parser.add_argument("--history", type=str, default="[]", help="Conversation history")
    args = parser.parse_args()
    
    conversation_history = json.loads(args.history)
    
    if args.stream:
        get_response(args.query, conversation_history, stream=True)
    else:
        print(get_response(args.query, conversation_history, stream=False)) 