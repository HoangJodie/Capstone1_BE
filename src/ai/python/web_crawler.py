from bs4 import BeautifulSoup
import requests
import os
from urllib.parse import urljoin
import time
from dotenv import load_dotenv
import sys
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

class WebCrawler:
    def __init__(self):
        self.frontend_url = os.getenv('FRONTEND_URL')
        if not self.frontend_url:
            raise Exception("Không tìm thấy FRONTEND_URL trong file .env")
        
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        self.crawled_data_dir = os.path.join(self.base_dir, 'documents', 'crawled_data')
        os.makedirs(self.crawled_data_dir, exist_ok=True)
        
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless')
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')

    def save_content(self, route, content):
        filename = f"{route}.txt"
        filepath = os.path.join(self.crawled_data_dir, filename)
        print(f"Lưu nội dung vào file: {filepath}", file=sys.stderr)
        print(f"Số lượng ký tự: {len(content)}", file=sys.stderr)
        
        # Format nội dung trước khi lưu
        formatted_content = content.replace("\n\n\n", "\n").replace("\n\n", "\n")
        
        with open(filepath, 'w', encoding='utf-8', errors='ignore') as f:
            f.write(formatted_content)
        print(f"Đã lưu thành công file {filename}", file=sys.stderr)

    def extract_text_content(self, driver):
        print("Đang đợi trang load...", file=sys.stderr)
        time.sleep(2)
        
        print("Đang lấy nội dung trang...", file=sys.stderr)
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        
        print("Đang xử lý nội dung...", file=sys.stderr)
        for tag in soup(['script', 'style', 'nav', 'footer']):
            tag.decompose()
            
        # Tạo dictionary để lưu nội dung đã xử lý
        processed_content = {}
        
        # Xử lý từng phần riêng biệt
        def process_plan(plan_name, price, features):
            if plan_name and price and features:
                return f"{plan_name}:\n- Giá: {price}\n- Tính năng:\n  + " + "\n  + ".join(features)
            return None
            
        current_plan = None
        current_price = None
        current_features = []
        
        text_elements = []
        for element in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'div']):
            try:
                text = element.get_text(strip=True)
                if not text:
                    continue
                    
                # Xử lý các plan
                if "Plan" in text or "VIP" in text:
                    if current_plan:
                        plan_text = process_plan(current_plan, current_price, current_features)
                        if plan_text:
                            text_elements.append(plan_text)
                    current_plan = text
                    current_price = None
                    current_features = []
                elif "₫" in text and current_plan:
                    current_price = text
                elif current_plan and len(text) > 10:
                    if text not in current_features and "Get Started" not in text:
                        current_features.append(text)
                        
            except Exception as e:
                print(f"Lỗi khi xử lý text: {str(e)}", file=sys.stderr)
                continue
        
        # Xử lý plan cuối cùng
        if current_plan:
            plan_text = process_plan(current_plan, current_price, current_features)
            if plan_text:
                text_elements.append(plan_text)
        
        print(f"Đã tìm thấy {len(text_elements)} đoạn text có ý nghĩa", file=sys.stderr)
        if len(text_elements) > 0:
            print("Ví dụ nội dung:", file=sys.stderr)
            print(text_elements[0][:200], file=sys.stderr)
                
        return text_elements

    def crawl_route(self, route):
        try:
            url = urljoin(self.frontend_url, f"/{route}")
            print(f"=== Bắt đầu crawl {url} ===", file=sys.stderr)
            
            driver = webdriver.Chrome(options=self.chrome_options)
            try:
                print(f"Đang truy cập {url}", file=sys.stderr)
                driver.get(url)
                
                content = self.extract_text_content(driver)
                
                if content:
                    print("Đang lọc nội dung trùng lặp...", file=sys.stderr)
                    unique_content = list(dict.fromkeys(content))
                    print(f"Còn lại {len(unique_content)} đoạn text sau khi lọc", file=sys.stderr)
                    
                    self.save_content(route, '\n\n'.join(unique_content))
                    print(f"=== Crawl {route} thành công ===", file=sys.stderr)
                    return True
                else:
                    print(f"Không tìm thấy nội dung trong {route}", file=sys.stderr)
                    return False
                    
            finally:
                driver.quit()
                print("Đã đóng browser", file=sys.stderr)
                
        except Exception as e:
            print(f"Lỗi khi crawl {url}: {str(e)}", file=sys.stderr)
            return False

def crawl_website(route=None):
    try:
        crawler = WebCrawler()
        if route:
            return crawler.crawl_route(route)
        return False
    except Exception as e:
        print(f"Lỗi: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    # Test crawl một route cụ thể
    crawl_website("instructors") 