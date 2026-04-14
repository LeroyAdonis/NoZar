import requests

def test_referral_redirect():
    # Since I don't have a referral code yet, I'll mock the check logic or just test the route existance
    # This just tests if the redirect works
    base_url = "http://localhost:5173"
    
    # Try a fake referral code
    response = requests.get(f"{base_url}/r/fake-code", allow_redirects=False)
    
    # It should redirect to /register
    assert response.status_code == 302
    assert "register" in response.headers["Location"]
    print("Test passed: /r/:referralCode redirects to /register")

if __name__ == "__main__":
    try:
        test_referral_redirect()
    except Exception as e:
        print(f"Test failed: {e}")
