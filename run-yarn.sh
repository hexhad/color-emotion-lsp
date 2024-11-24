#!/bin/bash

# Navigate to client directory and run yarn
echo "Running yarn in client directory..."
cd client
yarn
if [ $? -ne 0 ]; then
  echo "Yarn command failed in client directory. Exiting."
  exit 1
fi
cd ..

# Navigate to server directory and run yarn
echo "Running yarn in server directory..."
cd server
yarn
if [ $? -ne 0 ]; then
  echo "Yarn command failed in server directory. Exiting."
  exit 1
fi
cd ..

echo "Yarn commands completed successfully in both directories!"
