# Simple LSP Application Demo

#### This application is a simple demo showcasing the functionality of a Language Server Protocol (LSP). It consists of:

- A Node.js server
- A React frontend that includes Monaco Editor

###### The purpose is to demonstrate how LSP works in a basic setup.

### Setup Instructions

1. Grant Execute Permissions

##### Before proceeding, make the run-yarn.sh script executable:

```bash
chmod +x run-yarn.sh
```

2. Install Dependencies

##### Run the script to install the necessary Node.js modules for both the client and the server:

```bash
./run-yarn.sh
```

3. Start the Application

##### Once the dependencies are installed, start the server and the client as follows:

##### Start the Client

```bash
cd client && yarn start
```

Start the Server

```bash
cd server && yarn start
```

##### This completes the setup. The client and server should now be running and ready for demonstration.
