# rekroot Backend

This repository contains the backend codebase for **rekroot**, the HR Applicant Tracking System designed to empower HR professionals, facilitating streamlined hiring processes one step at a time. The live application can be accessed [here](https://rekroot.vercel.app/).

## Technologies Used

- **Express.js**: Powering the backend server infrastructure.
- **Supabase AUTH**: Handling authentication and user management.
- **MongoDB**: Used as the database for storing and managing data.

## Installation

To get started with the **rekroot** backend locally, follow these steps:

1. Clone the repository:

    ```
    git clone https://github.com/VoidVampire/rekroot.git
    ```

2. Navigate to the project directory:

    ```
    cd rekroot
    ```

3. Install the necessary dependencies:

    ```
    npm install
    ```

4. Run the development server:

    ```
    npm run dev
    ```

5. Create a `.env` file in the root directory and add the following environment variables:

    ```
    PORT=
    SUPABASE_URL=
    SUPABASE_ANON_KEY=
    MONGODB_URI=mon
    ```

Replace the values of `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `MONGODB_URI` with your specific configurations.

---