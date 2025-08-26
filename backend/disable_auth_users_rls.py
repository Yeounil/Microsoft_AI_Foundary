#!/usr/bin/env python3
"""
Disable Row Level Security for auth_users table
"""
import os
import sys
sys.path.append('/home/yeounil/MS_AI_FOUNDRY/backend')

from app.db.supabase_client import get_supabase
from app.core.config import settings

def disable_auth_users_rls():
    try:
        supabase = get_supabase()
        
        # Execute SQL to disable RLS on auth_users table
        result = supabase.rpc('execute_sql', {
            'sql': 'ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;'
        }).execute()
        
        print("✅ Successfully disabled RLS on auth_users table")
        print(f"Result: {result}")
        
    except Exception as e:
        print(f"❌ Error disabling RLS: {e}")
        print("Trying alternative approach...")
        
        # Alternative: Use raw SQL query if rpc doesn't work
        try:
            # This might work if the Supabase instance allows direct SQL
            from supabase import create_client
            supabase_client = create_client(settings.supabase_url, settings.supabase_key)
            
            # Try to execute via the REST API
            response = supabase_client.postgrest.rpc('sql', {
                'query': 'ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;'
            }).execute()
            
            print("✅ Successfully disabled RLS using alternative method")
            print(f"Response: {response}")
            
        except Exception as e2:
            print(f"❌ Alternative method also failed: {e2}")
            print("You may need to disable RLS manually in the Supabase dashboard:")
            print("1. Go to Supabase Dashboard > Authentication > Policies")
            print("2. Find auth_users table")
            print("3. Disable RLS or add a policy that allows INSERT")

if __name__ == "__main__":
    disable_auth_users_rls()