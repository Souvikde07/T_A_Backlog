This is a project for creating a Web Application for the nulab interview assignment. 

→ Functional Requirements:
    1. Create a web application with an input for inputting search keywords and a list/table for displaying the data.
    2. A keyword search input must be provided.
    3. A table view must show the fetched data.
    4. Each list item must include a "Favorite" checkbox.
    5. Pressing Enter on the input triggers a filtered search of the latest data.
    6. Without pressing Enter, all data should be displayed.
    7. Matching must be performed on all text fields of the API data.
    8. Only items with partial keyword match should be shown in the filtered view.
    9. If no data matches, a message should inform the user.
    10. At least the minimum required fields from the API must be shown (defined in a separate sheet).
    11. Design the application using tailwindcss for simplicity.(optional) 
    12. Local development environment is alright. 


→ Non-Functional Requirements:
    1. Performance
        The application should load and render data lists quickly (under 2 seconds).
        Filtering on keyword input should be responsive and not lag.

    2. Usability
        The UI should be intuitive for users, with clear input areas, list display, and favorite buttons.
        It should provide user feedback for actions like no results found or items marked as favorites.

    3. Maintainability
        Code should be modular and clean, allowing easy updates or scaling.
        Follow component-based architecture for reusability.

    4. Portability
        The app should run on all modern web browsers (Chrome, Firefox, Safari, Edge).

    5. Reliability
        The app should handle API failures or empty responses gracefully (e.g., with fallback messages).

    6. Data Persistence
        Favorite data should be stored using localStorage so it persists even after page reloads.


→ Tech Stack:
| Layer          | Tool/Library                  | Reason                                                  |
| -------------- | ----------------------------- | ------------------------------------------------------- |
| **Frontend**   | React.js                      | Component-based, responsive, widely used                |
| **Styling**    | Tailwind CSS                  | Fast and utility-first CSS framework, optional per spec |
| **State Mgmt** | React useState/useEffect      | Sufficient for this size project                        |
| **Storage**    | localStorage                  | For storing favorites locally                           |
| **API**        | Provided Backlog API          | As specified                                            |
| **Deployment** | Localhost or Vercel           | For demo purposes                                       |


→ UI Layout Plan (Wireframe Overview)
------------------------------------------------
|                 Header (Title)               |
------------------------------------------------
| Search Box [input text]   [Search Button]    |
------------------------------------------------
| Favorite Items (Pinned at Top)               |
| ------------------------------------------  |
| | ✅ | Title      | Description | Date    | |
| | ✅ | Task 2     | ...         | ...     | |
| ------------------------------------------  |
| Search Results List                         |
| ------------------------------------------  |
| | ⬜ | Task 3     | ...         | ...     | |
| | ⬜ | Task 4     | ...         | ...     | |
| ------------------------------------------  |
| [If no match: "No matching results found."] |
------------------------------------------------

→　Components Breakdown:
SearchInput: Input + Search Button (optional Enter key listener)

FavoritesList: Shows all favorited items (from localStorage)

SearchResults: Shows current filtered data or all updates

ListItem: Individual item row with a favorite checkbox

Message: For feedback like “No matching results”
