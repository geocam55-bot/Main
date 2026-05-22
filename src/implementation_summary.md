## Planner Tracking Integration

I've successfully extended the quote tracking and lead scoring functionality to the **Roof Planner**, **Shed Planner**, and **Kitchen Planner**.

### Implemented Changes

1.  **Unified Quote Generation:**
    - Modified `ProjectQuoteGenerator` to support `roof` and `kitchen` project types (in addition to existing types).
    - Added the **"Create Quote for Customer"** button to the **Materials** tab of:
        - **Roof Planner**
        - **Shed Planner**
        - **Kitchen Planner**
        - **Deck Planner** (ensured consistency)

2.  **Tracking & Scoring:**
    - Any quote created from these planners will now:
        - Be saved to the central `quotes` database.
        - Include a tracking pixel when emailed/viewed.
        - **Automatically trigger Lead Scoring** (+5 points for view, +10 for click) when the customer interacts with it.

### How to Use
1.  Open any planner (e.g., Roof Planner).
2.  Design the project.
3.  Go to the **Materials** tab.
4.  Click **"Create Quote for Customer"**.
5.  The generated quote is now fully tracked by the Marketing Module.