# Equipment Management Module - VIVA Guide

## Overview
The Equipment Management module enables suppliers to list equipment for rental and customers to rent equipment with date/quantity selection. The system tracks availability, calculates rental costs, and maintains rental history.

---

## PART 1: FRONTEND FILES

### 1. **EquipmentScreen.js** (Main Screen for Suppliers & Customers)
📁 Location: `src/screens/EquipmentScreen.js`

**Purpose:** 
- Suppliers: Create, read, update, delete (CRUD) equipment listings
- Customers: Browse available equipment

**Key Features:**
- **Equipment Display:** FlatList showing all available equipment with:
  - Equipment name, category, daily rate
  - Condition badge (new/excellent/good/fair) with color coding
  - Quantity available vs total
  - Availability status
  - Supplier name and location
  - Action buttons (Rent, Edit, Delete)

- **Supplier Form (Only visible to suppliers):**
  - Create new equipment listing
  - Edit existing equipment
  - Form fields:
    - Equipment Name (required)
    - Category (9 options: Power Tools, Hand Tools, Construction, Electrical, Plumbing, Landscaping, Safety, Vehicles, Other)
    - Equipment Condition (new/excellent/good/fair)
    - Daily Rental Price (LKR)
    - Description (optional)
    - Total Quantity
    - District/Location (25 Sri Lankan districts)
    - Availability toggle

- **Key Logic:**
  - Supplier mode detection: `user?.role === 'supplier'`
  - Own equipment detection: Filter items owned by current supplier
  - Form validation: Checks for required fields
  - Refresh functionality: Reload equipment list
  - Add/Close form toggle

**State Management:**
```javascript
const [items, setItems] = useState([]);           // All equipment
const [loading, setLoading] = useState(true);     // Loading state
const [error, setError] = useState("");           // Error messages
const [form, setForm] = useState(INITIAL_FORM);   // Form data
const [editingId, setEditingId] = useState("");   // Current editing item
const [showForm, setShowForm] = useState(false);  // Show/hide form
const [submitting, setSubmitting] = useState(false); // Form submission state
```

**Initial Form Template:**
```javascript
{
  equipmentName: "",
  equipmentDescription: "",
  category: "Power Tools",
  equipmentCondition: "good",
  rentalPricePerDay: "",
  quantityTotal: "1",
  isAvailable: true,
  location: "Colombo",
}
```

---

### 2. **RentEquipmentScreen.js** (Rental Process Screen)
📁 Location: `src/screens/RentEquipmentScreen.js`

**Purpose:** Enable customers to rent equipment with date and quantity selection

**Key Features:**
- **Date Selection:**
  - Start date picker (minimum: tomorrow)
  - End date picker (must be after start date)
  - DateTimePicker modal with spinner interface
  - Automatic validation and adjustment

- **Quantity Selection:**
  - Stepper component (+/- buttons)
  - Max quantity = quantityAvailable
  - Min quantity = 1

- **Rental Summary:**
  - Equipment name and condition
  - Supplier name
  - Location and daily rate
  - Number of days calculation: `Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))`
  - Total cost formula: `days × rentalPricePerDay × quantity`
  - Real-time cost update as user changes dates/quantity

**Process Flow:**
1. User receives equipment data via route params: `route.params?.equipment`
2. Sets default start date to tomorrow
3. Sets default end date to day after tomorrow
4. User selects start date → validates and auto-adjusts end date if needed
5. User selects end date → validates it's after start date
6. User adjusts quantity with stepper
7. Summary shows total cost
8. Click "Confirm Rental" → calls `rentEquipment()` API
9. Success alert shows rental details
10. Navigate back to equipment list

**State:**
```javascript
const [startDate, setStartDate] = useState(tomorrow);
const [endDate, setEndDate] = useState(dayAfter);
const [quantity, setQuantity] = useState(1);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState("");
```

---

### 3. **EquipmentCard Component** (Reusable Card)
📁 Part of: `src/screens/EquipmentScreen.js`

**Purpose:** Display individual equipment listing with actions

**Displays:**
- Equipment icon (construct-outline)
- Name, category
- Condition badge with color:
  - New: #22C55E (green)
  - Excellent: #3B82F6 (blue)
  - Good: #F59E0B (yellow)
  - Fair: #F97316 (orange)
- Daily rate
- Quantity available / total
- Availability status (green dot if available)
- Location and supplier name
- Action buttons based on user role:
  - **Customer:** "Rent Now" button (disabled if unavailable)
  - **Supplier (owner):** "Edit" and "Delete" buttons

**Props:**
```javascript
{
  item: Equipment,           // Equipment object
  canManage: boolean,        // Is supplier owner?
  isCustomer: boolean,       // Is user a customer?
  onEdit: Function,          // Edit handler
  onDelete: Function         // Delete handler
}
```

---

### 4. **API Client Functions** (Equipment Endpoints)
📁 Location: `src/services/apiClient.js`

**Available Functions:**

```javascript
// GET: Fetch all available equipment
getEquipment(token)

// POST: Create new equipment (supplier only)
createEquipment(token, payload)
// payload: { equipmentName, equipmentDescription, category, 
//            equipmentCondition, rentalPricePerDay, depositAmount,
//            quantityAvailable, quantityTotal }

// PUT: Update equipment (supplier only, own items)
updateEquipment(token, equipmentId, payload)

// DELETE: Delete equipment (supplier only, own items)
deleteEquipment(token, equipmentId)

// POST: Rent equipment (customer only)
rentEquipment(token, equipmentId, { startDate, endDate, quantity })
// Returns: rental object with rentalId, totalCost, etc.
```

---

### 5. **Supporting Components**
📁 Location: `src/components/`

- **FilterSheet.js** - Not directly used for equipment but available for filtering
- **SelectionField.js** - Could be used for field selection
- **PickerModal.js** - Used for date/district selection
- **StatusBadge.js** - Used for condition badges
- **ThemedInput.js** - Styled input component used in form

---

## PART 2: BACKEND FILES

### 1. **Equipment Model** (Database Schema)
📁 Location: `mobile-backend/models/Equipment.js`

**Schema Fields:**

```javascript
{
  supplier: ObjectId,              // FK to User (required)
  equipmentName: String,           // Required
  equipmentDescription: String,    // Optional
  category: String,                // Required
  equipmentCondition: {            // Enum: new, excellent, good, fair
    type: String,
    required: true
  },
  rentalPricePerDay: Number,       // Required
  depositAmount: Number,           // Default: 0
  quantityAvailable: Number,       // Default: 1 (decreases on rental)
  quantityTotal: Number,           // Default: 1 (never changes)
  location: String,                // Default: ''
  imagePath: String,               // Optional
  isAvailable: Boolean,            // Default: true (false when qty = 0)
  timestamps: true                 // createdAt, updatedAt
}
```

**Key Points:**
- `quantityAvailable` = how many units are currently available
- `quantityTotal` = total units listed (doesn't change)
- `isAvailable` = false when quantityAvailable reaches 0

---

### 2. **Equipment Routes** (API Endpoints)
📁 Location: `mobile-backend/routes/equipment.js`

**Endpoints:**

#### a) **GET /api/equipment** - List Equipment
```
Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 20, max: 100)
  - category: Filter by category (optional)

Authentication: Required (Bearer token)

Response: {
  status: 'success',
  data: {
    content: [equipment objects],
    pagination: { page, limit, total, pages }
  }
}

Features:
  - Filters for isAvailable: true (only available equipment)
  - Populates supplier info (firstName, lastName, companyName)
  - Sorted by newest first (createdAt: -1)
  - Pagination support
```

#### b) **GET /api/equipment/:id** - Get Single Equipment
```
Parameters:
  - id: Equipment ID

Response: {
  status: 'success',
  data: { equipment object with populated supplier details }
}
```

#### c) **POST /api/equipment** - Create Equipment
```
Authentication: Required + Supplier role only

Request Body: {
  equipmentName, equipmentDescription, category, equipmentCondition,
  rentalPricePerDay, depositAmount, quantityAvailable, quantityTotal,
  isAvailable, location
}

Validation:
  - Role must be 'supplier'
  - Only allowed fields are sanitized
  
Response: {
  status: 'success',
  data: { created equipment object }
}
```

#### d) **PUT /api/equipment/:id** - Update Equipment
```
Authentication: Required + Supplier role + Must own the equipment

Request Body: Same as POST

Validation:
  - Find equipment where _id AND supplier: req.userId
  - Only allowed fields are updated
  
Response: {
  status: 'success',
  data: { updated equipment object }
}
```

#### e) **DELETE /api/equipment/:id** - Delete Equipment
```
Authentication: Required + Supplier role + Must own the equipment

Validation:
  - Find equipment where _id AND supplier: req.userId
  
Response: {
  status: 'success',
  message: 'Equipment deleted'
}
```

#### f) **POST /api/equipment/:id/rent** - Rent Equipment 🔑 **CRITICAL**
```
Authentication: Required + Customer role only

Request Body: {
  startDate: ISO Date string,
  endDate: ISO Date string,
  quantity: Number
}

Validation Steps:
  1. Role must be 'customer'
  2. startDate, endDate, quantity all required
  3. startDate >= today (not in past)
  4. endDate > startDate (end after start)
  5. Equipment exists and isAvailable: true
  6. quantityAvailable >= requested quantity

Core Logic:
  1. Calculate days: Math.ceil((endDate - startDate) / ms_per_day)
  2. Calculate totalCost: days × pricePerDay × quantity
  3. DECREASE quantityAvailable by quantity
  4. If quantityAvailable === 0, set isAvailable = false
  5. Save updated equipment
  6. Create Rental record in DB
  7. Return rental details

Response: {
  status: 'success',
  data: {
    rentalId, equipmentId, equipmentName, supplier,
    startDate, endDate, quantity, days,
    pricePerDay, totalCost, currency: 'LKR',
    remainingStock: quantityAvailable
  }
}

Error Responses:
  - 403: "Only customers can rent equipment"
  - 400: "startDate, endDate, and quantity are required"
  - 400: "Start date cannot be in the past"
  - 400: "End date must be after start date"
  - 404: "Equipment not found"
  - 400: "Equipment is not available for rental"
  - 400: "Only X unit(s) available"
  - 500: General errors
```

---

### 3. **Rental Model** (For tracking rentals)
📁 Location: `mobile-backend/models/Rental.js`

**Schema Fields:**

```javascript
{
  customer: ObjectId,           // FK to User (required)
  equipment: ObjectId,          // FK to Equipment (required)
  supplier: ObjectId,           // FK to User (required)
  startDate: Date,              // When rental starts
  endDate: Date,                // When rental ends
  quantity: Number,             // Units rented (min: 1)
  days: Number,                 // Calculated days
  pricePerDay: Number,          // Snapshot of daily rate
  totalCost: Number,            // Calculated total
  status: {                      // Enum: active, returned, cancelled
    type: String,
    default: 'active'
  },
  returnedAt: Date,             // When equipment was returned
  timestamps: true              // createdAt, updatedAt
}
```

**Created When:** Customer successfully rents equipment
**Used For:** Tracking rental history, calculating revenue, managing returns

---

### 4. **Middleware Used**
📁 Location: `mobile-backend/middleware/`

**auth.js** - Authentication middleware
- Verifies Bearer token
- Extracts `userId` and `role` from JWT
- Attached to all protected routes
- Makes `req.user`, `req.userId` available

---

## PART 3: COMPLETE PROCESS FLOWS

### **Flow 1: Supplier Creates Equipment**
```
1. Supplier opens EquipmentScreen
2. Checks if role === 'supplier' (show form)
3. Clicks "Add" button
4. Form appears with INITIAL_FORM values
5. Fills all required fields:
   - Equipment Name
   - Category (chip picker)
   - Condition (chip picker)
   - Daily Rate (LKR)
   - Description (optional)
   - Quantity Total
   - Location (district dropdown)
   - Availability toggle (default: true)
6. Clicks "Create Listing" button
7. Frontend validates required fields
8. Calls API: POST /equipment with equipmentPayload()
   → equipmentPayload() transforms form data to match schema
   → quantityAvailable = quantityTotal (all units initially available)
   → supplier = req.userId (from token)
9. Backend creates Equipment document in MongoDB
10. Success: Form resets, equipment appears in list
11. Error: Shows actionError banner
```

### **Flow 2: Supplier Edits Equipment**
```
1. Supplier sees "Edit" button on owned equipment card
2. Clicks "Edit"
3. Form appears pre-filled with current equipment data
4. editingId is set to item._id
5. Supplier changes fields (e.g., price, quantity, availability)
6. Clicks "Update Equipment" button
7. Frontend validates required fields
8. Calls API: PUT /equipment/{id} with equipmentPayload()
9. Backend:
   - Finds equipment where _id AND supplier === req.userId
   - Updates only allowed fields (sanitizeEquipmentData)
   - Saves updated document
10. Success: Form resets, list refreshes with updated data
11. Error: Shows actionError banner

⚠️ Important: quantityAvailable is updated here to reflect rentals
Example: Supplier sets quantityTotal to 10, after 3 rentals:
- quantityTotal stays 10
- quantityAvailable is 7 (read-only from system, updated by rentals)
```

### **Flow 3: Supplier Deletes Equipment**
```
1. Supplier sees "Delete" button on owned equipment card
2. Clicks "Delete"
3. Confirmation alert appears: "Remove [equipment name]?"
4. Clicks "Delete" to confirm (or "Cancel" to abort)
5. Calls API: DELETE /equipment/{id}
6. Backend:
   - Finds equipment where _id AND supplier === req.userId
   - Uses findOneAndDelete() to remove it
7. Success: Equipment removed from list
8. Error: Shows actionError banner
```

### **Flow 4: Customer Browses Equipment** 
```
1. Customer opens EquipmentScreen
2. Role !== 'supplier' (form not shown)
3. FlatList loads all equipment where isAvailable: true
4. Equipment cards show:
   - Name, category, condition badge, daily rate
   - Quantity available / total
   - Supplier name, location
   - "Rent Now" button (enabled if isAvailable: true)
5. For each equipment card:
   - Condition color indicates quality
   - Availability status shown with green dot
6. Customer can pull to refresh using "Refresh" button
7. Loading spinner shows while fetching
```

### **Flow 5: Customer Rents Equipment** ⭐ **MOST IMPORTANT**
```
1. Customer clicks "Rent Now" on equipment card
2. Navigation passes equipment object: navigation.navigate('RentEquipment', { equipment })
3. RentEquipmentScreen loads with equipment details:
   - Displays equipment name, daily rate, condition
   - Shows supplier name, location
   - Shows maximum available quantity

4. Date Selection:
   a. Default startDate = tomorrow
   b. Default endDate = day after tomorrow
   c. Customer clicks "Select Start Date"
      → DatePickerModal opens with spinner
      → Can't select today or past dates
      → Minimum date = tomorrow
      → Confirms selection → setStartDate()
      → If endDate <= startDate, auto-adjust endDate to startDate + 1 day
   
   d. Customer clicks "Select End Date"
      → DatePickerModal opens with spinner
      → Minimum date = start date + 1 day
      → Confirms selection → validates endDate > startDate
      → If valid → setEndDate(), clear error
      → If invalid → show error: "End date must be after start date"

5. Quantity Selection:
   - Stepper component with +/- buttons
   - Minimum: 1, Maximum: quantityAvailable
   - Customer adjusts quantity

6. Real-Time Summary Calculation:
   ```javascript
   days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
   totalCost = days × rate × quantity
   
   Example:
   - startDate: May 5, 2026
   - endDate: May 7, 2026
   - quantity: 2
   - rate: 1500 LKR/day
   → days = 2
   → totalCost = 2 × 1500 × 2 = 6000 LKR
   ```

7. Review Summary (displayed in real-time):
   - Equipment name
   - Rental dates (e.g., "5 May → 7 May")
   - Quantity
   - Daily rate
   - Total days
   - TOTAL COST (highlighted)

8. Customer clicks "Confirm Rental" button

9. **API Call: POST /equipment/{id}/rent**
   ```
   Request Body: {
     startDate: "2026-05-05T00:00:00.000Z",
     endDate: "2026-05-07T00:00:00.000Z",
     quantity: 2
   }
   ```

10. **Backend Processing:**
    a. Verify customer role (403 if not customer)
    b. Validate all parameters exist
    c. Parse dates, validate startDate >= today
    d. Validate endDate > startDate
    e. Fetch equipment with supplier populated
    f. Check equipment exists
    g. Check isAvailable: true
    h. Check quantityAvailable >= quantity
    i. Calculate days = Math.ceil((endDate - startDate) / ms)
    j. Calculate totalCost = days × pricePerDay × quantity
    
    k. **UPDATE EQUIPMENT:**
       - equipment.quantityAvailable -= quantity
       - if (quantityAvailable === 0): equipment.isAvailable = false
       - equipment.save()
    
    l. **CREATE RENTAL:**
       ```javascript
       Rental {
         customer: userId,
         equipment: equipmentId,
         supplier: equipment.supplier._id,
         startDate, endDate, quantity,
         days, pricePerDay, totalCost,
         status: 'active'
       }
       ```
    m. Respond with rental details

11. **Frontend Success Response:**
    - Show success alert with:
      - Equipment name
      - Rental dates formatted
      - Quantity
      - Total cost in LKR
    - User clicks "Done"
    - Navigate back to EquipmentScreen
    - Equipment list refreshes showing updated quantities

12. **Error Handling:**
    - Shows error banner with message
    - User can correct input and retry
    - Examples:
      - "Only customers can rent equipment"
      - "Equipment is not available for rental"
      - "Only 3 unit(s) available"
      - "Start date cannot be in the past"
      - "End date must be after start date"
```

---

## PART 4: KEY CONCEPTS & LOGIC

### **1. Quantity Management**
```
quantityTotal:       Never changes. Total units supplier listed (e.g., 5)
quantityAvailable:   Decreases with each rental. Current available units
isAvailable:         Flag. Set to FALSE when quantityAvailable === 0

Example Timeline:
- Supplier creates equipment: quantityTotal=5, quantityAvailable=5, isAvailable=true
- Customer 1 rents 2 units: quantityAvailable=3, isAvailable=true
- Customer 2 rents 3 units: quantityAvailable=0, isAvailable=false ❌
- Customer 3 tries to rent: Gets error "Equipment is not available for rental"

When customer returns units? 
→ Rental.status changes to 'returned'
→ quantityAvailable is incremented (separate flow, may not be in current code)
```

### **2. Role-Based Access Control**
```
SUPPLIER ROLE:
  ✓ Can CREATE equipment (POST /equipment)
  ✓ Can READ all equipment (GET /equipment)
  ✓ Can UPDATE own equipment (PUT /equipment/:id)
  ✓ Can DELETE own equipment (DELETE /equipment/:id)
  ✓ Can see Edit/Delete buttons on owned items
  ✗ Cannot rent equipment

CUSTOMER ROLE:
  ✓ Can READ available equipment (GET /equipment)
  ✓ Can RENT equipment (POST /equipment/:id/rent)
  ✓ Can see Rent Now button
  ✗ Cannot create/edit/delete equipment
```

### **3. Date Calculations**
```
Days Calculation:
const diffMs = endDate - startDate;
const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

Example:
- startDate: May 5, 2026, 00:00:00
- endDate: May 7, 2026, 00:00:00
- diffMs = 2 days (in milliseconds)
- days = Math.ceil(2 days / 1000ms/60sec/60min/24hrs) = 2

Cost Calculation:
totalCost = days × rentalPricePerDay × quantity
Example:
- days: 2
- rentalPricePerDay: 1500 LKR
- quantity: 3
- totalCost = 2 × 1500 × 3 = 9000 LKR
```

### **4. Condition Badges - Color Coding**
```
Condition | Color   | Hex Code | Meaning
----------|---------|----------|------------------
New       | Green   | #22C55E  | Brand new, never used
Excellent | Blue    | #3B82F6  | Like new, minimal wear
Good      | Amber   | #F59E0B  | Well maintained, minor wear
Fair      | Orange  | #F97316  | Worn but functional
```

### **5. Data Sanitization**
```
In backend routes, sanitizeEquipmentData() ensures only
allowed fields are saved:

Allowed Fields: [
  'equipmentName', 'equipmentDescription', 'category',
  'equipmentCondition', 'rentalPricePerDay', 'depositAmount',
  'quantityAvailable', 'quantityTotal', 'isAvailable', 'location'
]

This prevents:
- Direct injection of 'supplier' field (always set from req.userId)
- Malicious fields from being stored in database
- Schema violations
```

### **6. Supplier Identity Verification**
```
When updating/deleting equipment:

Equipment.findOne({
  _id: equipmentId,
  supplier: req.userId  ← Only finds if current user is the owner
})

This ensures a supplier can only modify/delete THEIR OWN equipment.
Not just checking after fetching (good security practice).
```

---

## PART 5: API CONFIGURATION

📁 Location: `src/config/apiConfig.js`

```javascript
API_BASE_URL = http://localhost:3000  (or production URL)
```

All equipment endpoints use this base URL:
- GET  /equipment
- POST /equipment
- PUT  /equipment/:id
- DELETE /equipment/:id
- POST /equipment/:id/rent

---

## PART 6: IMPORTANT INTERVIEW QUESTIONS TO PREPARE

### Conceptual
1. **How does quantityAvailable differ from quantityTotal?**
   - quantityTotal is set by supplier, never changes
   - quantityAvailable decreases with rentals, reflects current availability

2. **What happens when a customer rents 3 units out of 5 available?**
   - quantityAvailable: 5 → 2
   - isAvailable: true (still has stock)
   - Equipment still visible to other customers

3. **What happens when the last unit is rented?**
   - quantityAvailable: 1 → 0
   - isAvailable: false (set automatically)
   - Equipment becomes hidden from customer browse (filtered in GET)

4. **How is the total rental cost calculated?**
   - Formula: days × rentalPricePerDay × quantity
   - Days include both start and end dates (Math.ceil)
   - Example: 2-day rental at 1000 LKR/day for 3 units = 6000 LKR

5. **Why can't a customer select today as a start date?**
   - minimumDate = tomorrow in date picker
   - Backend also validates: startDate >= today (00:00)
   - Business logic: Equipment must be rented for future dates

6. **What security measures protect supplier equipment?**
   - Role-based checks (supplier role required for CRUD)
   - Ownership verification (supplier: req.userId in query)
   - Field sanitization (only allowed fields saved)
   - Token authentication (Bearer token required)

### Technical
7. **What happens if end date is set to same as start date?**
   - Frontend validation: "End date must be after start date"
   - RentEquipmentScreen auto-adjusts if you change start date
   - Backend validation: end <= start returns 400 error

8. **How is the supplier information populated in equipment list?**
   - Equipment.populate('supplier', 'firstName lastName companyName')
   - Joins User document to show supplier details
   - Only these fields are exposed (not password, email, etc.)

9. **What are the enum values for equipment condition?**
   - ['new', 'excellent', 'good', 'fair']
   - Schema strictly enforces these values
   - Invalid condition rejected at model level

10. **How does pagination work in GET /equipment?**
    - page: 1 (default), limit: 20 (default)
    - skip = (page - 1) × limit
    - Returns pagination object: { page, limit, total, pages }
    - Prevents loading thousands of items at once

### Scenario-Based
11. **Scenario: A supplier wants to increase the rental price of existing equipment. Can they?**
    - Yes, via PUT /equipment/:id
    - rentalPricePerDay can be updated
    - Only affects NEW rentals, not existing ones (which have pricePerDay snapshot)

12. **Scenario: A customer tries to rent equipment that's already fully rented.**
    - Backend check: quantityAvailable < quantity
    - Returns: "Only X unit(s) available"
    - Customer must reduce quantity or choose different equipment

13. **Scenario: What happens if a customer's rental starts today (now) but they try to book?**
    - Frontend: Calendar won't allow today selection (minimumDate = tomorrow)
    - Backend: Validation `startDate < today` returns 400 error
    - User must select future date

14. **Scenario: If a supplier deletes equipment, what happens to existing rentals?**
    - Equipment can be deleted
    - Existing Rental records remain in DB (reference may break)
    - This is a data integrity issue - may need cascade rules or soft deletes

---

## PART 7: FILES SUMMARY TABLE

| File | Type | Role | Key Responsibility |
|------|------|------|-------------------|
| EquipmentScreen.js | Frontend | Both | Browse/CRUD equipment |
| RentEquipmentScreen.js | Frontend | Customer | Rent equipment UI |
| Equipment.js | Backend | Model | Equipment schema |
| equipment.js (routes) | Backend | API | Equipment endpoints |
| Rental.js | Backend | Model | Rental tracking |
| apiClient.js | Frontend | Service | API calls |
| AuthContext.js | Frontend | Auth | User & token state |

---

## PART 8: COMMON MISTAKES TO AVOID IN VIVA

1. **Confusing quantityAvailable with quantityTotal**
   - These are different: one changes, one doesn't

2. **Forgetting role-based access control**
   - Customers can't create equipment
   - Suppliers can't rent equipment
   - Backend enforces this, not just frontend

3. **Not explaining the complete rental flow**
   - Should mention: date validation → quantity check → availability check → quantity decrease → rental record creation

4. **Saying quantityAvailable is user-set**
   - Supplier sets quantityTotal
   - System automatically decreases quantityAvailable
   - Supplier can only change it by editing and setting new quantityTotal

5. **Forgetting about cost calculation**
   - Must explain days, pricePerDay, quantity multiplication

6. **Not knowing the validation sequence**
   - Backend has specific order: role check → field validation → date validation → availability check → quantity check

---

## PART 9: QUICK REFERENCE - ENDPOINTS & METHODS

```
GET    /equipment                    → Fetch all available equipment
GET    /equipment/:id                → Fetch single equipment detail
POST   /equipment                    → Create equipment (supplier)
PUT    /equipment/:id                → Update equipment (supplier, own)
DELETE /equipment/:id                → Delete equipment (supplier, own)
POST   /equipment/:id/rent           → Rent equipment (customer)
```

All require authentication (Bearer token)
