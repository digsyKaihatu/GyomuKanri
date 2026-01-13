
import asyncio
from playwright.async_api import async_playwright, expect
import os
import subprocess
import time

async def main():
    # Start a simple HTTP server in the background
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    time.sleep(1) # Give the server a moment to start

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Navigate to the local verification HTML file
            verification_url = "http://localhost:8000/verification/verification.html"
            print(f"Navigating to: {verification_url}")
            await page.goto(verification_url)

            # Wait for our custom rendering logic to complete
            await page.wait_for_timeout(2000)

            # Click the summary to open the details section
            await page.locator("summary", has_text="表示設定").click()

            # Assert that the display settings list is visible
            settings_list = page.locator("#task-display-settings-list")
            await expect(settings_list).to_be_visible()

            # Assert that the correct number of checkboxes are rendered
            await expect(settings_list.locator('input[type="checkbox"]')).to_have_count(2)

            # Assert the checked state based on mocked preferences
            # "テスト業務1" is in hiddenTasks, so its checkbox should be UNCHECKED.
            await expect(settings_list.locator('input[data-task-name="テスト業務1"]')).not_to_be_checked()
            # "テスト業務2" is not in hiddenTasks, so its checkbox should be CHECKED.
            await expect(settings_list.locator('input[data-task-name="テスト業務2"]')).to_be_checked()

            # Take the screenshot
            screenshot_path = "/app/verification/verification.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            await browser.close()
    finally:
        # Stop the HTTP server
        server_process.kill()

if __name__ == "__main__":
    asyncio.run(main())
