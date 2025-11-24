"""
Playwright Worker - 별도 프로세스에서 PDF 생성
Windows subprocess 이슈를 우회하기 위한 동기 Playwright 실행
"""
import sys
import json
from playwright.sync_api import sync_playwright


def html_to_pdf_sync(html_content: str, output_path: str) -> bool:
    """동기 방식으로 HTML을 PDF로 변환"""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            page = browser.new_page()
            page.set_content(html_content, wait_until='networkidle')

            page.pdf(
                path=output_path,
                format='A4',
                print_background=True,
                margin={
                    'top': '15mm',
                    'right': '12mm',
                    'bottom': '15mm',
                    'left': '12mm'
                },
                scale=0.95
            )

            browser.close()
            return True
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python playwright_worker.py <html_file> <output_pdf>", file=sys.stderr)
        sys.exit(1)

    html_file = sys.argv[1]
    output_pdf = sys.argv[2]

    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        success = html_to_pdf_sync(html_content, output_pdf)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
