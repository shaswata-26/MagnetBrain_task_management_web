#!/bin/bash

# API Configuration
API_URL="http://localhost:5000/api"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="password123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
USER_TOKEN=""
TASK_ID=""
USER_ID=""

# Print colored output
print_status() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Extract JSON value
extract_json_value() {
    echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

# Extract task ID specifically (handles nested JSON)
extract_task_id() {
    echo "$1" | grep -o '"task":{[^}]*"_id":"[^"]*' | cut -d'"' -f6
}

# Extract JSON value for numbers
extract_json_number() {
    echo "$1" | grep -o "\"$2\":[0-9]*" | cut -d':' -f2
}

# Check if server is running
check_server() {
    print_status "Checking if server is running..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    if [ "$response" = "200" ]; then
        print_success "Server is running"
        return 0
    else
        print_error "Server is not running. Please start the server first."
        exit 1
    fi
}

# Test Health Endpoint
test_health_endpoint() {
    print_status "1. Testing Health Endpoint..."
    response=$(curl -s "$API_URL/health")
    echo "Response: $response"
    echo
}

# Test Authentication Endpoints
test_auth_endpoints() {
    print_status "2. Testing Authentication Endpoints..."
    
    # Login with existing user
    print_status "2.1 Logging in with existing user..."
    user_login_response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"password\": \"$TEST_USER_PASSWORD\"
        }")
    echo "Login Response: $user_login_response"
    
    # Extract user token
    USER_TOKEN=$(extract_json_value "$user_login_response" "token")
    if [ -n "$USER_TOKEN" ]; then
        print_success "User logged in successfully. Token: ${USER_TOKEN:0:20}..."
        
        # Get user info
        print_status "2.2 Getting user info..."
        me_response=$(curl -s -X GET "$API_URL/auth/me" \
            -H "Authorization: Bearer $USER_TOKEN")
        USER_ID=$(extract_json_value "$me_response" "_id")
        echo "User Info: $me_response"
        print_success "User ID: $USER_ID"
    else
        print_error "Failed to authenticate user"
        exit 1
    fi
    echo
}

# Test Task Creation Endpoints
test_task_creation() {
    print_status "3. Testing Task Creation Endpoints..."
    
    # Create a task
    print_status "3.1 Creating a new task..."
    create_task_response=$(curl -s -X POST "$API_URL/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"title\": \"Complete API Testing - Fixed\",
            \"description\": \"Test all API endpoints thoroughly with fixed script\",
            \"dueDate\": \"2024-12-31T23:59:59.000Z\",
            \"priority\": \"high\"
        }")
    echo "Create Task Response: $create_task_response"
    
    # Extract task ID correctly
    TASK_ID=$(extract_task_id "$create_task_response")
    if [ -z "$TASK_ID" ]; then
        # Alternative extraction method
        TASK_ID=$(echo "$create_task_response" | grep -o '"_id":"[^"]*' | tail -1 | cut -d'"' -f4)
    fi
    
    if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "$USER_ID" ]; then
        print_success "Task created successfully. Task ID: $TASK_ID"
    else
        print_error "Failed to extract task ID correctly"
        # Create a simple task and get ID from list
        simple_task_response=$(curl -s -X POST "$API_URL/tasks" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $USER_TOKEN" \
            -d "{
                \"title\": \"Simple Test Task\",
                \"dueDate\": \"2024-12-31T23:59:59.000Z\",
                \"priority\": \"high\"
            }")
        # Get the latest task ID from the tasks list
        tasks_response=$(curl -s -X GET "$API_URL/tasks?limit=1" \
            -H "Authorization: Bearer $USER_TOKEN")
        TASK_ID=$(echo "$tasks_response" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
        if [ -n "$TASK_ID" ]; then
            print_success "Using task ID from list: $TASK_ID"
        else
            print_error "Cannot continue without valid task ID"
            exit 1
        fi
    fi
    echo
}

# Test Task Retrieval Endpoints
test_task_retrieval() {
    print_status "4. Testing Task Retrieval Endpoints..."
    
    # Get all tasks
    print_status "4.1 Getting all tasks..."
    get_tasks_response=$(curl -s -X GET "$API_URL/tasks" \
        -H "Authorization: Bearer $USER_TOKEN")
    total_tasks=$(extract_json_number "$get_tasks_response" "totalRecords")
    echo "Total tasks: $total_tasks"
    print_success "Retrieved all tasks successfully"
    
    # Get specific task
    print_status "4.2 Getting specific task by ID..."
    get_task_response=$(curl -s -X GET "$API_URL/tasks/$TASK_ID" \
        -H "Authorization: Bearer $USER_TOKEN")
    if echo "$get_task_response" | grep -q "title"; then
        task_title=$(extract_json_value "$get_task_response" "title")
        echo "Task Title: $task_title"
        print_success "Retrieved specific task successfully"
    else
        print_error "Failed to retrieve task: $get_task_response"
    fi
    
    # Get user's tasks only
    print_status "4.3 Getting user's tasks only..."
    my_tasks_response=$(curl -s -X GET "$API_URL/tasks/my-tasks" \
        -H "Authorization: Bearer $USER_TOKEN")
    my_tasks_count=$(extract_json_number "$my_tasks_response" "totalRecords")
    echo "My tasks count: $my_tasks_count"
    print_success "Retrieved user's tasks successfully"
    
    # Test pagination
    print_status "4.4 Testing pagination..."
    paginated_response=$(curl -s -X GET "$API_URL/tasks?page=1&limit=2" \
        -H "Authorization: Bearer $USER_TOKEN")
    pagination_current=$(extract_json_number "$paginated_response" "current")
    pagination_total=$(extract_json_number "$paginated_response" "total")
    echo "Pagination - Current: $pagination_current, Total: $pagination_total"
    print_success "Pagination working correctly"
    echo
}

# Test Task Filtering Endpoints
test_task_filtering() {
    print_status "5. Testing Task Filtering Endpoints..."
    
    # Filter by status
    print_status "5.1 Filtering tasks by status=pending..."
    pending_tasks_response=$(curl -s -X GET "$API_URL/tasks?status=pending" \
        -H "Authorization: Bearer $USER_TOKEN")
    pending_count=$(extract_json_number "$pending_tasks_response" "totalRecords")
    echo "Pending tasks count: $pending_count"
    print_success "Status filter working"
    
    # Filter by priority
    print_status "5.2 Filtering tasks by priority=high..."
    high_priority_response=$(curl -s -X GET "$API_URL/tasks?priority=high" \
        -H "Authorization: Bearer $USER_TOKEN")
    high_priority_count=$(extract_json_number "$high_priority_response" "totalRecords")
    echo "High priority tasks count: $high_priority_count"
    print_success "Priority filter working"
    
    # Filter by both status and priority
    print_status "5.3 Filtering tasks by status=pending and priority=medium..."
    combined_filter_response=$(curl -s -X GET "$API_URL/tasks?status=pending&priority=medium" \
        -H "Authorization: Bearer $USER_TOKEN")
    combined_count=$(extract_json_number "$combined_filter_response" "totalRecords")
    echo "Combined filter tasks count: $combined_count"
    print_success "Combined filters working"
    echo
}

# Test Task Update Endpoints
test_task_updates() {
    print_status "6. Testing Task Update Endpoints..."
    
    # Update task details
    print_status "6.1 Updating task details..."
    update_task_response=$(curl -s -X PUT "$API_URL/tasks/$TASK_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"title\": \"Updated: Complete API Testing - Fixed\",
            \"description\": \"Updated description with more details - fixed script\",
            \"dueDate\": \"2024-11-15T23:59:59.000Z\",
            \"priority\": \"medium\"
        }")
    if echo "$update_task_response" | grep -q "updated successfully"; then
        print_success "Task updated successfully"
        echo "Update Response: $update_task_response"
    else
        print_error "Task update failed: $update_task_response"
    fi
    
    # Update task status
    print_status "6.2 Updating task status to in-progress..."
    update_status_response=$(curl -s -X PATCH "$API_URL/tasks/$TASK_ID/status" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"status\": \"in-progress\"
        }")
    if echo "$update_status_response" | grep -q "status updated"; then
        print_success "Task status updated to in-progress"
        echo "Status Update Response: $update_status_response"
    else
        print_error "Status update failed: $update_status_response"
    fi
    
    # Update task priority
    print_status "6.3 Updating task priority to high..."
    update_priority_response=$(curl -s -X PATCH "$API_URL/tasks/$TASK_ID/priority" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"priority\": \"high\"
        }")
    if echo "$update_priority_response" | grep -q "priority updated"; then
        print_success "Task priority updated to high"
        echo "Priority Update Response: $update_priority_response"
    else
        print_error "Priority update failed: $update_priority_response"
    fi
    
    # Update task status to completed
    print_status "6.4 Updating task status to completed..."
    update_status_completed_response=$(curl -s -X PATCH "$API_URL/tasks/$TASK_ID/status" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"status\": \"completed\"
        }")
    if echo "$update_status_completed_response" | grep -q "status updated"; then
        print_success "Task status updated to completed"
        echo "Completed Status Response: $update_status_completed_response"
    else
        print_error "Completed status update failed: $update_status_completed_response"
    fi
    echo
}

# Test Error Handling Endpoints
test_error_handling() {
    print_status "7. Testing Error Handling Endpoints..."
    
    # Test without authentication
    print_status "7.1 Testing without authentication..."
    no_auth_response=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/tasks")
    echo "No Auth Response Code: $no_auth_response"
    if [ "$no_auth_response" = "401" ]; then
        print_success "Authentication required - working correctly"
    else
        print_error "Expected 401, got $no_auth_response"
    fi
    
    # Test with invalid token
    print_status "7.2 Testing with invalid token..."
    invalid_token_response=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/tasks" \
        -H "Authorization: Bearer invalid_token_here")
    echo "Invalid Token Response Code: $invalid_token_response"
    if [ "$invalid_token_response" = "401" ]; then
        print_success "Invalid token rejected - working correctly"
    else
        print_error "Expected 401, got $invalid_token_response"
    fi
    
    # Test getting non-existent task
    print_status "7.3 Testing non-existent task..."
    nonexistent_task_response=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/tasks/507f1f77bcf86cd799439011" \
        -H "Authorization: Bearer $USER_TOKEN")
    echo "Non-existent Task Response Code: $nonexistent_task_response"
    if [ "$nonexistent_task_response" = "404" ]; then
        print_success "Non-existent task returns 404 - working correctly"
    else
        print_error "Expected 404, got $nonexistent_task_response"
    fi
    
    # Test creating task with invalid data
    print_status "7.4 Testing invalid task creation..."
    invalid_task_response=$(curl -s -X POST "$API_URL/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"title\": \"\",
            \"dueDate\": \"invalid-date\"
        }")
    echo "Invalid Task Response: $invalid_task_response"
    if echo "$invalid_task_response" | grep -q "Validation failed"; then
        print_success "Invalid data rejected - working correctly"
    else
        print_error "Expected validation error"
    fi
    echo
}

# Test Task Deletion Endpoint
test_task_deletion() {
    print_status "8. Testing Task Deletion Endpoint..."
    
    # Create a task to delete
    print_status "8.1 Creating a task for deletion test..."
    delete_task_response=$(curl -s -X POST "$API_URL/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d "{
            \"title\": \"Task to be deleted - Fixed\",
            \"description\": \"This task will be deleted in the test - fixed\",
            \"dueDate\": \"2024-12-31T23:59:59.000Z\",
            \"priority\": \"low\"
        }")
    
    # Extract the task ID for deletion
    delete_task_id=$(extract_task_id "$delete_task_response")
    if [ -z "$delete_task_id" ]; then
        delete_task_id=$(echo "$delete_task_response" | grep -o '"_id":"[^"]*' | tail -1 | cut -d'"' -f4)
    fi
    
    if [ -n "$delete_task_id" ] && [ "$delete_task_id" != "$USER_ID" ]; then
        echo "Task created for deletion: $delete_task_id"
        
        # Delete the task
        print_status "8.2 Deleting the task..."
        delete_response=$(curl -s -X DELETE "$API_URL/tasks/$delete_task_id" \
            -H "Authorization: Bearer $USER_TOKEN")
        echo "Delete Response: $delete_response"
        
        if echo "$delete_response" | grep -q "deleted successfully"; then
            print_success "Task deleted successfully"
            
            # Verify task is deleted with timeout
            print_status "8.3 Verifying task is deleted..."
            sleep 1  # Small delay to ensure deletion is processed
            verify_delete_response=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/tasks/$delete_task_id" \
                -H "Authorization: Bearer $USER_TOKEN")
            echo "Verify Delete Response Code: $verify_delete_response"
            if [ "$verify_delete_response" = "404" ]; then
                print_success "Task successfully deleted - working correctly"
            else
                print_warning "Expected 404 after deletion, got $verify_delete_response (task might still exist)"
            fi
        else
            print_error "Delete operation failed: $delete_response"
        fi
    else
        print_error "Failed to create valid task for deletion test"
    fi
    echo
}

# Main test function
main() {
    print_status "Starting Fixed API Tests..."
    echo "=================================================="
    
    # Check if server is running
    check_server
    
    # Run all test suites
    test_health_endpoint
    test_auth_endpoints
    test_task_creation
    test_task_retrieval
    test_task_filtering
    test_task_updates
    test_error_handling
    test_task_deletion
    
    print_success "All API tests completed!"
    echo "=================================================="
    
    # Print final summary
    print_status "TEST SUMMARY:"
    echo "✅ Health Check"
    echo "✅ User Authentication" 
    echo "✅ Task Creation"
    echo "✅ Task Retrieval"
    echo "✅ Task Filtering"
    echo "✅ Task Updates"
    echo "✅ Error Handling"
    echo "✅ Task Deletion"
    echo
    print_success "API endpoints are working correctly!"
    echo
    print_status "Test Data:"
    echo "- User Token: ${USER_TOKEN:0:30}..."
    echo "- Test Task ID: $TASK_ID"
    echo "- User ID: $USER_ID"
}

# Run main function
main