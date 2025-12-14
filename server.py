#!/usr/bin/env python3
"""
Simple HTTP server to serve the dashboard locally.
This avoids CORS issues when opening HTML files directly.
Includes SQL Server API endpoint for flights data.
"""

import http.server
import socketserver
import webbrowser
import os
import json
import urllib.parse

# SQL Server Configuration
# Update these values to match your SQL Server setup
SQL_SERVER = ".\\SQLEXPRESS"  # Local named instance (use "localhost\\SQLEXPRESS" if .\\ doesn't work)
SQL_DATABASE = "test"  # Change this to your database name
SQL_USERNAME = ""  # Empty for Windows Authentication
SQL_PASSWORD = ""  # Empty for Windows Authentication
SQL_DRIVER = "{ODBC Driver 17 for SQL Server}"  # Common driver, adjust if needed

PORT = 8000

def list_odbc_drivers():
    """List available ODBC drivers on the system."""
    try:
        import pyodbc
        drivers = pyodbc.drivers()
        print("Available ODBC Drivers:")
        for driver in drivers:
            print(f"  - {driver}")
        return drivers
    except ImportError:
        print("ERROR: pyodbc is not installed. Install it with: pip install pyodbc")
        return []
    except Exception as e:
        print(f"Error listing drivers: {e}")
        return []

def get_sql_connection():
    """Create and return a SQL Server connection."""
    try:
        import pyodbc
        
        # Build connection string
        if SQL_USERNAME and SQL_PASSWORD:
            # SQL Server Authentication
            conn_str = (
                f"DRIVER={SQL_DRIVER};"
                f"SERVER={SQL_SERVER};"
                f"DATABASE={SQL_DATABASE};"
                f"UID={SQL_USERNAME};"
                f"PWD={SQL_PASSWORD}"
            )
        else:
            # Windows Authentication
            conn_str = (
                f"DRIVER={SQL_DRIVER};"
                f"SERVER={SQL_SERVER};"
                f"DATABASE={SQL_DATABASE};"
                f"Trusted_Connection=yes;"
            )
        
        return pyodbc.connect(conn_str)
    except ImportError:
        print("ERROR: pyodbc is not installed. Install it with: pip install pyodbc")
        return None
    except Exception as e:
        print(f"ERROR connecting to SQL Server: {e}")
        return None

def query_flights():
    """Query flights from SQL Server. Update the SQL query to match your table structure."""
    print("Attempting to connect to SQL Server...")
    conn = get_sql_connection()
    if not conn:
        print("ERROR: Could not establish database connection")
        return None
    
    print("Database connection established successfully")
    
    try:
        cursor = conn.cursor()
        # Query flights table with columns: id, date, from, to, duration
        # Note: "from" is a SQL reserved word, so we use brackets
        query = "SELECT id, date, [from], [to], price, duration FROM flights ORDER BY date ASC"
        print(f"Executing query: {query}")
        cursor.execute(query)
        
        # Get column names
        columns = [column[0] for column in cursor.description]
        print(f"Query returned columns: {columns}")
        
        # Fetch all rows
        rows = cursor.fetchall()
        print(f"Query returned {len(rows)} rows")
        
        # Convert to list of dictionaries
        from decimal import Decimal
        flights = []
        for row in rows:
            flight = dict(zip(columns, row))
            # Convert datetime objects to strings and Decimal to float for JSON serialization
            for key, value in flight.items():
                if value is None:
                    # Keep None as None
                    continue
                elif hasattr(value, 'isoformat'):
                    # Convert datetime to ISO format string
                    flight[key] = value.isoformat()
                elif isinstance(value, Decimal):
                    # Convert Decimal to float for JSON serialization
                    flight[key] = float(value)
            flights.append(flight)
        
        print(f"Successfully processed {len(flights)} flights")
        return flights
    except Exception as e:
        print(f"ERROR querying flights: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        if conn:
            conn.close()
            print("Database connection closed")

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests, including API endpoints."""
        try:
            # Parse the path
            parsed_path = urllib.parse.urlparse(self.path)
            
            # Handle API endpoints
            if parsed_path.path == '/api/flights':
                self.handle_flights_api()
                return
            elif parsed_path.path == '/api/test-connection':
                self.handle_test_connection()
                return
            
            # Default: serve static files
            super().do_GET()
        except Exception as e:
            # Catch any unexpected errors and return JSON
            print(f"Unexpected error in do_GET: {e}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': f'Unexpected server error: {str(e)}'
            }).encode())
    
    def handle_test_connection(self):
        """Test endpoint to check database connection."""
        try:
            print("TEST: Testing database connection...")
            conn = get_sql_connection()
            
            if conn:
                # Try a simple query
                cursor = conn.cursor()
                cursor.execute("SELECT @@VERSION")
                version = cursor.fetchone()[0]
                conn.close()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'message': 'Database connection successful!',
                    'sql_server_version': version[:100] if version else 'Unknown'
                }).encode())
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': 'Could not establish database connection. Check server console for details.'
                }).encode())
        except Exception as e:
            error_msg = str(e)
            print(f"TEST ERROR: {error_msg}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': error_msg
            }).encode())
    
    def handle_flights_api(self):
        """Handle the /api/flights endpoint."""
        try:
            print("API: /api/flights endpoint called")
            flights = query_flights()
            
            if flights is None:
                error_msg = 'Failed to query flights from database. Check server console for details.'
                print(f"API ERROR: {error_msg}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': error_msg
                }).encode())
                return
            
            print(f"API: Returning {len(flights)} flights")
            # Send successful response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(flights).encode())
            
        except Exception as e:
            error_msg = f'Server error: {str(e)}'
            print(f"API EXCEPTION: {error_msg}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': error_msg
            }).encode())
    
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the directory where this script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # List available ODBC drivers on startup
    print("\n" + "="*50)
    print("Checking ODBC Drivers...")
    list_odbc_drivers()
    print("="*50 + "\n")
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}/dashboard.html"
        print(f"Server starting on port {PORT}...")
        print(f"Dashboard available at: {url}")
        print("Press Ctrl+C to stop the server")
        
        # Try to open browser automatically
        try:
            webbrowser.open(url)
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()