#!/usr/bin/env python3
"""
Test the actual table schema in Supabase
"""
import sys
import asyncio
import httpx
sys.path.append('/home/yeounil/MS_AI_FOUNDRY/backend')

from app.core.config import settings

async def check_table_schema():
    """Check the actual auth_users table schema"""
    try:
        headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Get table info - this might not work with REST API, but worth trying
        async with httpx.AsyncClient() as client:
            # Try to get one row to see the structure
            response = await client.get(
                f"{settings.supabase_url}/rest/v1/auth_users?select=*&limit=1",
                headers=headers,
                timeout=10.0
            )
            
            print(f"Response status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Data structure: {data}")
                if data:
                    print(f"First row keys: {list(data[0].keys())}")
                else:
                    print("No data found in table")
            
    except Exception as e:
        print(f"Error: {e}")

async def test_uuid_generation():
    """Test if we can generate UUID manually"""
    try:
        headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # Try inserting with explicit UUID generation
        import uuid
        test_user = {
            "id": str(uuid.uuid4()),  # Generate UUID manually
            "username": f"test_uuid_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "hashed_password": "test_hash"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.supabase_url}/rest/v1/auth_users",
                json=test_user,
                headers=headers,
                timeout=10.0
            )
            
            print(f"UUID test response status: {response.status_code}")
            print(f"UUID test response: {response.text}")
            
            if response.status_code == 201:
                print("✅ UUID generation works!")
                result = response.json()
                print(f"Created user: {result}")
            else:
                print("❌ UUID generation failed")
                
    except Exception as e:
        print(f"UUID test error: {e}")

if __name__ == "__main__":
    print("Checking table schema...")
    asyncio.run(check_table_schema())
    
    print("\nTesting UUID generation...")
    asyncio.run(test_uuid_generation())