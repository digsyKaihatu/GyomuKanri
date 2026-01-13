
import asyncio
from playwright.async_api import async_playwright, expect
import subprocess
import time

async def main():
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    time.sleep(1)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            verification_url = "http://localhost:8000/verification/verify_break_reservation_delete.html"
            print(f"Navigating to: {verification_url}")
            await page.goto(verification_url)

            # --- Test 1: Initial Click ---
            print("--- Running Test 1: Initial Click ---")
            delete_button_1 = page.locator('button[data-id="1"]')
            await delete_button_1.click()

            # Check if our custom modal is visible
            await expect(page.locator("#confirmation-modal")).to_be_visible()
            # Click OK in our custom modal
            await page.locator("#confirm-ok").click()

            # Verify confirm was called exactly once
            initial_call_count = await page.evaluate("window.getConfirmCallCount()")
            print(f"Confirm call count after first click: {initial_call_count}")
            assert initial_call_count == 1, f"Expected 1 confirm call, but got {initial_call_count}"
            print("Test 1 PASSED.")


            # --- Test 2: Click After Re-render ---
            print("\\n--- Running Test 2: Click After Re-render ---")

            # Simulate re-rendering the component
            await page.locator("#rerender-btn").click()
            await page.wait_for_timeout(500) # Wait for re-render

            # Click the same delete button again
            await delete_button_1.click()

            # Check if our custom modal is visible again
            await expect(page.locator("#confirmation-modal")).to_be_visible()
            # Click OK in our custom modal
            await page.locator("#confirm-ok").click()

            # Verify confirm was called exactly twice (once from the first test, once now)
            final_call_count = await page.evaluate("window.getConfirmCallCount()")
            print(f"Confirm call count after second click: {final_call_count}")
            assert final_call_count == 2, f"Expected 2 total confirm calls, but got {final_call_count}"
            print("Test 2 PASSED.")

            screenshot_path = "/app/verification/verification.png"
            await page.screenshot(path=screenshot_path)
            print(f"\\nScreenshot saved to {screenshot_path}")

            await browser.close()
    finally:
        server_process.kill()

if __name__ == "__main__":
    asyncio.run(main())
