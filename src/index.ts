#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { TodoistApi } from "@doist/todoist-api-typescript";

// Tool definitions
const GET_PROJECTS_TOOL: Tool = {
  name: "todoist_get_projects",
  description: "Retrieve all projects from Todoist",
  inputSchema: {
    type: "object",
    properties: {}
  }
};
const CREATE_TASK_TOOL: Tool = {
  name: "todoist_create_task",
  description: "Create a new task in Todoist with optional description, due date, and priority",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The content/title of the task"
      },
      description: {
        type: "string",
        description: "Detailed description of the task (optional)"
      },
      due_string: {
        type: "string",
        description: "Natural language due date like 'tomorrow', 'next Monday', 'Jan 23' (optional)"
      },
      priority: {
        type: "number",
        description: "Task priority from 1 (normal) to 4 (urgent) (optional)",
        enum: [1, 2, 3, 4]
      }
    },
    required: ["content"]
  }
};

const GET_TASKS_TOOL: Tool = {
  name: "todoist_get_tasks",
  description: "Get a list of tasks from Todoist",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

const UPDATE_TASK_TOOL: Tool = {
  name: "todoist_update_task",
  description: "Update an existing task in Todoist by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the task to update" },
      content: { type: "string", description: "New content/title for the task (optional)" },
      description: { type: "string", description: "New description for the task (optional)" },
      due_string: { type: "string", description: "New due date in natural language (optional)" },
      priority: { type: "number", description: "New priority level from 1 (normal) to 4 (urgent) (optional)", enum: [1, 2, 3, 4] }
    },
    required: ["id"]
  }
};

const COMPLETE_TASK_TOOL: Tool = {
  name: "todoist_complete_task",
  description: "Complete (close) a task in Todoist by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the task to complete" }
    },
    required: ["id"]
  }
};

const DELETE_TASK_TOOL: Tool = {
  name: "todoist_delete_task",
  description: "Delete a task from Todoist by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the task to delete" }
    },
    required: ["id"]
  }
};

const GET_PROJECT_BY_ID_TOOL: Tool = {
  name: "todoist_get_project_by_id",
  description: "Get a specific project from Todoist by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the project" }
    },
    required: ["id"]
  }
};

const CREATE_PROJECT_TOOL: Tool = {
  name: "todoist_create_project",
  description: "Create a new project in Todoist",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the project" },
      parent_id: { type: "string", description: "Parent project ID (optional)" },
      color: { type: "string", description: "Color of the project (optional)" }
    },
    required: ["name"]
  }
};

const UPDATE_PROJECT_TOOL: Tool = {
  name: "todoist_update_project",
  description: "Update an existing project in Todoist by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the project to update" },
      name: { type: "string", description: "New name of the project (optional)" },
      color: { type: "string", description: "New color of the project (optional)" }
    },
    required: ["id"]
  }
};

const ARCHIVE_PROJECT_TOOL: Tool = {
  name: "todoist_archive_project",
  description: "Archive a project by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "ID of the project to archive" }
    },
    required: ["id"]
  }
};

const GET_PROJECT_TASKS_TOOL: Tool = {
  name: "todoist_get_project_tasks",
  description: "Get tasks associated with a specific Todoist project",
  inputSchema: {
    type: "object",
    properties: {
      project_id: { type: "string", description: "ID of the project to get tasks from" }
    },
    required: ["project_id"]
  }
};

// Server implementation
const server = new Server(
  {
    name: "todoist-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Check for API token
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN!;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize Todoist client
const todoistClient = new TodoistApi(TODOIST_API_TOKEN);

// Type guards for arguments
function isCreateTaskArgs(args: unknown): args is { 
  content: string;
  description?: string;
  due_string?: string;
  priority?: number;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "content" in args &&
    typeof (args as { content: string }).content === "string"
  );
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    CREATE_TASK_TOOL,
    GET_TASKS_TOOL,
    UPDATE_TASK_TOOL,
    COMPLETE_TASK_TOOL,
    DELETE_TASK_TOOL,
    GET_PROJECTS_TOOL,
    GET_PROJECT_BY_ID_TOOL,
    CREATE_PROJECT_TOOL,
    UPDATE_PROJECT_TOOL,
    ARCHIVE_PROJECT_TOOL,
    GET_PROJECT_TASKS_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (name === "todoist_create_task") {
      if (!args) throw new Error("No arguments provided");
      if (!isCreateTaskArgs(args)) {
        throw new Error("Invalid arguments for todoist_create_task");
      }
      const task = await todoistClient.addTask({
        content: args.content,
        description: args.description,
        dueString: args.due_string,
        priority: args.priority
      });
      return {
        content: [{
          type: "text",
          text: `Task created:\nTitle: ${task.content}${task.description ? `\nDescription: ${task.description}` : ''}${task.due ? `\nDue: ${task.due.string}` : ''}${task.priority ? `\nPriority: ${task.priority}` : ''}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_get_tasks") {
      const { results: tasks } = await todoistClient.getTasks();
      const taskList = tasks.map(task =>
        `- ${task.content} (ID: ${task.id})${task.description ? `\n  Description: ${task.description}` : ''}${task.due ? `\n  Due: ${task.due.string}` : ''}${task.priority ? `\n  Priority: ${task.priority}` : ''}`
      ).join('\n\n');
      return {
        content: [{
          type: "text",
          text: tasks.length > 0 ? taskList : "No tasks found."
        }],
        isError: false,
      };
    }
    if (name === "todoist_update_task") {
      if (!args) throw new Error("No arguments provided");
      const { id, content, description, due_string, priority } = args as {
        id: string;
        content?: string;
        description?: string;
        due_string?: string;
        priority?: number;
      };
      if (!id) throw new Error("Missing required argument 'id'");
      const updateData: any = {};
      if (content) updateData.content = content;
      if (description) updateData.description = description;
      if (due_string) updateData.dueString = due_string;
      if (priority) updateData.priority = priority;
      const updatedTask = await todoistClient.updateTask(id, updateData);
      return {
        content: [{
          type: "text",
          text: `Task updated:\nTitle: ${updatedTask.content}${updatedTask.description ? `\nDescription: ${updatedTask.description}` : ''}${updatedTask.due ? `\nDue: ${updatedTask.due.string}` : ''}${updatedTask.priority ? `\nPriority: ${updatedTask.priority}` : ''}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_complete_task") {
      if (!args) throw new Error("No arguments provided");
      const { id } = args as { id: string };
      if (!id) throw new Error("Missing required argument 'id'");
      await todoistClient.closeTask(id);
      return {
        content: [{
          type: "text",
          text: `Successfully completed task with ID: ${id}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_delete_task") {
      if (!args) throw new Error("No arguments provided");
      const { id } = args as { id: string };
      if (!id) throw new Error("Missing required argument 'id'");
      await todoistClient.deleteTask(id);
      return {
        content: [{
          type: "text",
          text: `Successfully deleted task with ID: ${id}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_get_projects") {
      const { results: projects } = await todoistClient.getProjects();
      const projectList = projects.map(project =>
        `- ${project.name} (ID: ${project.id})`
      ).join('\n');
      return {
        content: [{
          type: "text",
          text: projects.length > 0 ? projectList : "No projects found."
        }],
        isError: false,
      };
    }
    if (name === "todoist_get_project_by_id") {
      if (!args) throw new Error("No arguments provided");
      const { id } = args as { id: string };
      const project = await todoistClient.getProject(id);
      return {
        content: [{
          type: "text",
          text: `Project: ${project.name} (ID: ${project.id})`
        }],
        isError: false,
      };
    }
    if (name === "todoist_create_project") {
      if (!args) throw new Error("No arguments provided");
      const { name, parent_id, color } = args as { name: string, parent_id?: string, color?: string };
      const project = await todoistClient.addProject({ name, parentId: parent_id, color: color as any });
      return {
        content: [{
          type: "text",
          text: `Created project: ${project.name} (ID: ${project.id})`
        }],
        isError: false,
      };
    }
    if (name === "todoist_update_project") {
      if (!args) throw new Error("No arguments provided");
      const { id, name, color } = args as { id: string, name?: string, color?: string };
      await todoistClient.updateProject(id, { name, color: color as any });
      return {
        content: [{
          type: "text",
          text: `Updated project ID: ${id}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_archive_project") {
      if (!args) throw new Error("No arguments provided");
      const { id } = args as { id: string };
      await todoistClient.deleteProject(id);
      return {
        content: [{
          type: "text",
          text: `Archived project ID: ${id}`
        }],
        isError: false,
      };
    }
    if (name === "todoist_get_project_tasks") {
      if (!args) throw new Error("No arguments provided");
      const { project_id } = args as { project_id: string };
      const { results: tasks } = await todoistClient.getTasks({ projectId: project_id });
      const taskList = tasks.map(task =>
        `- ${task.content} (ID: ${task.id})${task.description ? `\n  Description: ${task.description}` : ''}${task.due ? `\n  Due: ${task.due.string}` : ''}${task.priority ? `\n  Priority: ${task.priority}` : ''}`
      ).join('\n\n');
      return {
        content: [{
          type: "text",
          text: tasks.length > 0 ? taskList : `No tasks found for project ID: ${project_id}`
        }],
        isError: false,
      };
    }
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Todoist MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});