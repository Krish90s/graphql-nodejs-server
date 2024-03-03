import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/my_database");
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

// Define Mongoose schema
const todoSchema = new mongoose.Schema({
  task: String,
  completed: Boolean,
});

const TodoModel = mongoose.model("Todo", todoSchema);

// The GraphQL schema
const typeDefs = `#graphql
type Todo {
    id: ID!
    task: String!
    completed: Boolean!
  }

   type Query {
    todos: [Todo!]!
    todoById(id: ID!): Todo
  }

  type Mutation {
    createTodo(task: String!, completed: Boolean!): Todo
    updateTodo(id: ID!, task: String, completed: Boolean): Todo
    deleteTodo(id: ID!): Todo
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    todos: async () => await TodoModel.find(),
    todoById: async (_, { id }) => await TodoModel.findById(id),
  },
  Mutation: {
    createTodo: async (_, { task, completed }) => {
      const todo = new TodoModel({ task, completed });
      await todo.save();
      return todo;
    },
    updateTodo: async (_, { id, task, completed }) => {
      const todo = await TodoModel.findByIdAndUpdate(
        id,
        { task, completed },
        { new: true }
      );
      return todo;
    },
    deleteTodo: async (_, { id }) => {
      const todo = await TodoModel.findByIdAndDelete(id);
      return todo;
    },
  },
};

const app = express();
const httpServer = http.createServer(app);

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
await server.start();

app.use(cors(), bodyParser.json(), expressMiddleware(server));

await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
console.log(`🚀 Server ready at http://localhost:4000`);
