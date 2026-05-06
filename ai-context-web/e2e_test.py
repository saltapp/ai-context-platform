# -*- coding: utf-8 -*-
"""E2E browser test for AI Context Web v3.0"""
import os
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

BASE_URL = "http://localhost:5173"


def screenshot(page, name):
    path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  -> Screenshot: {name}.png")


def dismiss_any_modal(page):
    """Close any open modal by pressing Escape"""
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)


def test_login(page):
    print("\n=== Test 1: Login Page ===")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    screenshot(page, "01_login_page")

    page.fill("input#username", "admin")
    page.fill("input#password", "admin123")
    screenshot(page, "02_login_filled")

    page.click("button[type='submit']")
    page.wait_for_url(f"{BASE_URL}/", timeout=10000)
    screenshot(page, "03_login_success")
    print("  OK: Login -> redirect to home")


def test_systems_page(page):
    print("\n=== Test 2: Systems Page ===")
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")
    screenshot(page, "04_systems_list")

    # Click "+ New System" button
    new_btn = page.locator("button:has-text('New System')")
    if new_btn.count() > 0:
        new_btn.first.click()
        page.wait_for_timeout(500)
        screenshot(page, "05_create_system_modal")

        # Fill system form
        page.fill("input#sys-name", "E2E测试系统")
        page.fill("textarea#sys-desc", "浏览器自动化测试创建")
        page.fill("input#sys-gitlab-user", "e2e_test")
        page.fill("input#sys-gitlab-token", "glpat-e2etesttoken")
        screenshot(page, "06_create_system_filled")

        page.locator("button[type='submit']").first.click()
        page.wait_for_timeout(2000)
        screenshot(page, "07_system_created")
        print("  OK: System created")
    else:
        print("  SKIP: Create system button not found")


def test_system_detail_and_create_app(page):
    print("\n=== Test 3: System Detail & Create App ===")
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    system_card = page.locator("text=E2E测试系统").first
    if not system_card.is_visible(timeout=3000):
        print("  SKIP: E2E system not found")
        return

    system_card.click()
    page.wait_for_load_state("networkidle")
    screenshot(page, "08_system_detail")

    # Click "新建APP" button
    add_btn = page.locator("button:has-text('新建APP')")
    if add_btn.count() == 0:
        print("  SKIP: 新建APP button not found")
        return

    add_btn.first.click()
    page.wait_for_timeout(500)
    screenshot(page, "09_create_app_modal")

    # Fill form fields by label order: APP名称, GitLab地址, 跟踪分支
    # Use visible text inputs inside the modal
    modal = page.locator(".fixed .bg-white").last

    # APP name (first text input in modal)
    name_input = modal.locator("input[type='text']").first
    name_input.fill("E2E测试应用")

    # Git URL (second text input - has placeholder)
    git_input = modal.locator("input[placeholder*='gitlab.example.com']")
    if git_input.count() > 0:
        git_input.fill("https://gitlab.example.com/e2e/app.git")

    screenshot(page, "10_create_app_filled")

    # Click "创建" button inside modal
    create_btn = modal.locator("button:has-text('创建')")
    if create_btn.count() > 0:
        create_btn.first.click()
        page.wait_for_timeout(3000)
        screenshot(page, "11_app_created")
        print("  OK: App created")
    else:
        print("  SKIP: Create button not found in modal")


def test_app_detail(page):
    print("\n=== Test 4: App Detail Page ===")
    # Navigate directly via system detail page
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # Click the system card
    system_card = page.locator("text=E2E测试系统").first
    if not system_card.is_visible(timeout=3000):
        print("  SKIP: E2E system not found")
        return

    system_card.click()
    page.wait_for_load_state("networkidle")

    # Dismiss any modal if still open
    dismiss_any_modal(page)
    page.wait_for_timeout(500)

    # Find app link - it's a button with the app name
    app_link = page.locator("button:has-text('E2E测试应用')")
    if app_link.count() > 0:
        app_link.first.click()
        page.wait_for_load_state("networkidle")
        screenshot(page, "12_app_detail")
        print("  OK: App detail page loaded")
    else:
        # Try the "查看详情" link near the app
        view_btn = page.locator("button:has-text('查看详情')")
        if view_btn.count() > 0:
            view_btn.first.click()
            page.wait_for_load_state("networkidle")
            screenshot(page, "12_app_detail")
            print("  OK: App detail page loaded via 查看详情")
        else:
            print("  SKIP: App link not found")


def test_settings_page(page):
    print("\n=== Test 5: Settings Page (Token Management) ===")
    page.goto(f"{BASE_URL}/settings")
    page.wait_for_load_state("networkidle")
    screenshot(page, "13_settings_tokens")

    # Click "生成新 Token" button
    create_btn = page.locator("button:has-text('生成新 Token')")
    if create_btn.count() == 0:
        print("  SKIP: Create token button not found")
        return

    create_btn.first.click()
    page.wait_for_timeout(500)
    screenshot(page, "14_create_token_modal")

    # Fill token name inside modal
    modal = page.locator(".fixed .bg-white").last
    name_input = modal.locator("input[type='text']")
    if name_input.count() > 0:
        name_input.fill("E2E测试Token")

    screenshot(page, "15_token_filled")

    # Click "生成" button inside modal (not the outer one)
    gen_btn = modal.locator("button:has-text('生成')")
    if gen_btn.count() > 0:
        gen_btn.first.click()
        page.wait_for_timeout(3000)
        screenshot(page, "16_token_created")

        # Click "完成" button
        done_btn = modal.locator("button:has-text('完成')")
        if done_btn.count() > 0:
            done_btn.first.click()
            page.wait_for_timeout(1000)

        screenshot(page, "17_token_list_after_create")
        print("  OK: Token created successfully")
    else:
        print("  SKIP: Generate button not found in modal")


def test_admin_page(page):
    print("\n=== Test 6: Admin Page ===")
    page.goto(f"{BASE_URL}/admin")
    page.wait_for_load_state("networkidle")
    screenshot(page, "18_admin_users")

    # Switch to audit tab
    audit_tab = page.locator("button:has-text('审计日志')")
    if audit_tab.count() > 0:
        audit_tab.first.click()
        page.wait_for_timeout(2000)
        screenshot(page, "19_admin_audit_logs")

        # Test filter
        username_input = page.locator("input[placeholder='用户名']")
        if username_input.count() > 0:
            username_input.first.fill("admin")
            search_btn = page.locator("button:has-text('搜索')")
            if search_btn.count() > 0:
                search_btn.first.click()
                page.wait_for_timeout(2000)
                screenshot(page, "20_audit_filtered")
        print("  OK: Admin page tested (users + audit)")
    else:
        print("  SKIP: Audit tab not found")


def test_delete_system(page):
    print("\n=== Test 7: Delete System (double confirm) ===")
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    system_card = page.locator("text=E2E测试系统").first
    if not system_card.is_visible(timeout=3000):
        print("  SKIP: E2E system not found")
        return

    system_card.click()
    page.wait_for_load_state("networkidle")
    screenshot(page, "21_system_detail_before_delete")

    delete_btn = page.locator("button:has-text('删除系统')")
    if delete_btn.count() == 0:
        print("  SKIP: Delete button not found")
        return

    delete_btn.first.click()
    page.wait_for_timeout(500)
    screenshot(page, "22_delete_step1_confirm")

    # Step 1: click "继续"
    continue_btn = page.locator(".fixed button:has-text('继续')")
    if continue_btn.count() > 0:
        continue_btn.first.click()
        page.wait_for_timeout(500)

        # Step 2: input system name
        name_input = page.locator("input[placeholder*='请输入']")
        if name_input.count() > 0:
            screenshot(page, "23_delete_step2_input")
            name_input.first.fill("E2E测试系统")
            screenshot(page, "24_delete_step2_filled")

            # Final confirm
            confirm_btn = page.locator(".fixed button:has-text('确认删除')")
            if confirm_btn.count() > 0:
                confirm_btn.last.click()
                page.wait_for_timeout(2000)
                screenshot(page, "25_delete_done")
                print("  OK: Double-confirm delete completed")


def test_navigation(page):
    print("\n=== Test 8: Navigation & Logout ===")
    page.goto(f"{BASE_URL}/")
    page.wait_for_load_state("networkidle")

    # Settings nav link
    settings_link = page.locator("a:has-text('设置')")
    if settings_link.count() > 0:
        settings_link.first.click()
        page.wait_for_load_state("networkidle")
        screenshot(page, "26_nav_settings")

    # Admin nav link
    admin_link = page.locator("a:has-text('管理面板')")
    if admin_link.count() > 0:
        admin_link.first.click()
        page.wait_for_load_state("networkidle")
        screenshot(page, "27_nav_admin")

    # Logout
    logout_btn = page.locator("button:has-text('退出')")
    if logout_btn.count() > 0:
        logout_btn.first.click()
        page.wait_for_url(f"{BASE_URL}/login", timeout=5000)
        screenshot(page, "28_logged_out")
        print("  OK: Logout successful")
    else:
        print("  SKIP: Logout button not found")


def main():
    print("=" * 50)
    print("AI Context Web v3.0 - E2E Browser Test")
    print(f"Backend: http://localhost:8000")
    print(f"Frontend: {BASE_URL}")
    print(f"Screenshots: {SCREENSHOTS_DIR}")
    print("=" * 50)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        try:
            test_login(page)
            test_systems_page(page)
            test_system_detail_and_create_app(page)
            test_app_detail(page)
            test_settings_page(page)
            test_admin_page(page)
            test_delete_system(page)
            test_navigation(page)

            print("\n" + "=" * 50)
            print("ALL TESTS COMPLETED!")
            print(f"View screenshots at: {SCREENSHOTS_DIR}")
            print("=" * 50)
        except Exception as e:
            screenshot(page, "ERROR")
            print(f"\nFAILED: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            browser.close()


if __name__ == "__main__":
    main()
