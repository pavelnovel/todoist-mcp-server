#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TodoistApi, type ColorKey } from "@doist/todoist-api-typescript";

// Check for API token
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
if (!TODOIST_API_TOKEN) {
  console.error("Error: TODOIST_API_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize Todoist client
const todoistClient = new TodoistApi(TODOIST_API_TOKEN);

// Create server
const server = new McpServer({
  name: "todoist-mcp-server",
  version: "0.3.0",
});

// ===================
// TASK TOOLS
// ===================

server.tool(
  "todoist_create_task",
  "Create a new task in Todoist with optional description, due date, priority, labels, and section",
  {
    content: z.string().describe("The content/title of the task"),
    description: z.string().optional().describe("Detailed description of the task"),
    due_string: z.string().optional().describe("Natural language due date like 'tomorrow', 'next Monday', 'Jan 23'"),
    priority: z.number().min(1).max(4).optional().describe("Task priority from 1 (normal) to 4 (urgent)"),
    project_id: z.string().optional().describe("ID of the project"),
    section_id: z.string().optional().describe("ID of the section"),
    labels: z.array(z.string()).optional().describe("Array of label names to apply to the task"),
  },
  async ({ content, description, due_string, priority, project_id, section_id, labels }) => {
    const task = await todoistClient.addTask({
      content,
      description,
      dueString: due_string,
      priority,
      projectId: project_id,
      sectionId: section_id,
      labels,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Task created:\nID: ${task.id}\nTitle: ${task.content}${task.description ? `\nDescription: ${task.description}` : ""}${task.due ? `\nDue: ${task.due.string}` : ""}${task.priority ? `\nPriority: ${task.priority}` : ""}${task.labels?.length ? `\nLabels: ${task.labels.join(", ")}` : ""}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_tasks",
  "Get a list of tasks from Todoist with optional filters. Paginates automatically to return all results.",
  {
    project_id: z.string().optional().describe("Filter tasks by project ID"),
    section_id: z.string().optional().describe("Filter tasks by section ID"),
    label: z.string().optional().describe("Filter tasks by label name"),
    filter: z.string().optional().describe("Filter query like 'today', 'overdue', '@label_name'"),
  },
  async ({ project_id, section_id, label, filter }) => {
    const params: any = {};
    if (project_id) params.projectId = project_id;
    if (section_id) params.sectionId = section_id;
    if (label) params.label = label;
    if (filter) params.filter = filter;

    const allTasks: Awaited<ReturnType<typeof todoistClient.getTasks>>["results"] = [];
    let cursor: string | null | undefined = undefined;
    do {
      const response = await todoistClient.getTasks({ ...params, cursor: cursor ?? undefined });
      allTasks.push(...response.results);
      cursor = response.nextCursor;
    } while (cursor);

    const taskList = allTasks
      .map(
        (task) =>
          `- ${task.content} (ID: ${task.id})${task.description ? `\n  Description: ${task.description}` : ""}${task.due ? `\n  Due: ${task.due.string}` : ""}${task.priority ? `\n  Priority: ${task.priority}` : ""}${task.labels?.length ? `\n  Labels: ${task.labels.join(", ")}` : ""}${task.addedAt ? `\n  Created: ${task.addedAt}` : ""}`
      )
      .join("\n\n");
    return {
      content: [
        {
          type: "text" as const,
          text: allTasks.length > 0 ? taskList : "No tasks found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_update_task",
  "Update an existing task in Todoist by ID",
  {
    id: z.string().describe("ID of the task to update"),
    content: z.string().optional().describe("New content/title for the task"),
    description: z.string().optional().describe("New description for the task"),
    due_string: z.string().optional().describe("New due date in natural language"),
    priority: z.number().min(1).max(4).optional().describe("New priority level from 1 (normal) to 4 (urgent)"),
    labels: z.array(z.string()).optional().describe("New array of label names"),
  },
  async ({ id, content, description, due_string, priority, labels }) => {
    const updateData: any = {};
    if (content) updateData.content = content;
    if (description !== undefined) updateData.description = description;
    if (due_string) updateData.dueString = due_string;
    if (priority) updateData.priority = priority;
    if (labels) updateData.labels = labels;

    const updatedTask = await todoistClient.updateTask(id, updateData);
    return {
      content: [
        {
          type: "text" as const,
          text: `Task "${updatedTask.content}" updated:\nID: ${updatedTask.id}${updatedTask.description ? `\nDescription: ${updatedTask.description}` : ""}${updatedTask.due ? `\nDue: ${updatedTask.due.string}` : ""}${updatedTask.priority ? `\nPriority: ${updatedTask.priority}` : ""}${updatedTask.labels?.length ? `\nLabels: ${updatedTask.labels.join(", ")}` : ""}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_delete_task",
  "Delete a task from Todoist by ID",
  {
    id: z.string().describe("ID of the task to delete"),
  },
  async ({ id }) => {
    await todoistClient.deleteTask(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully deleted task with ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_complete_task",
  "Complete (close) a task in Todoist by ID",
  {
    id: z.string().describe("ID of the task to complete"),
  },
  async ({ id }) => {
    await todoistClient.closeTask(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Task completed successfully (ID: ${id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_reopen_task",
  "Reopen a completed task by ID",
  {
    id: z.string().describe("ID of the task to reopen"),
  },
  async ({ id }) => {
    await todoistClient.reopenTask(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Task reopened successfully (ID: ${id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_move_task",
  "Move a task to a different project, section, or parent task",
  {
    id: z.string().describe("ID of the task to move"),
    project_id: z.string().optional().describe("ID of the destination project"),
    section_id: z.string().optional().describe("ID of the destination section"),
    parent_id: z.string().optional().describe("ID of the parent task"),
  },
  async ({ id, project_id, section_id, parent_id }) => {
    const moveArgs: any = {};
    if (project_id) moveArgs.projectId = project_id;
    if (section_id) moveArgs.sectionId = section_id;
    if (parent_id) moveArgs.parentId = parent_id;
    const task = await todoistClient.moveTask(id, moveArgs);
    return {
      content: [
        {
          type: "text" as const,
          text: `Moved task "${task.content}" (ID: ${task.id})`,
        },
      ],
    };
  }
);

// ===================
// PROJECT TOOLS
// ===================

server.tool(
  "todoist_get_projects",
  "Retrieve all projects from Todoist",
  {},
  async () => {
    const response = await todoistClient.getProjects();
    const projects = response.results;
    const projectList = projects.map((project) => `- ${project.name} (ID: ${project.id})`).join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: projects.length > 0 ? projectList : "No projects found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_project_by_id",
  "Get a specific project from Todoist by ID",
  {
    id: z.string().describe("ID of the project"),
  },
  async ({ id }) => {
    const project = await todoistClient.getProject(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Project: ${project.name} (ID: ${project.id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_create_project",
  "Create a new project in Todoist",
  {
    name: z.string().describe("Name of the project"),
    parent_id: z.string().optional().describe("Parent project ID"),
    color: z.string().optional().describe("Color of the project"),
  },
  async ({ name, parent_id, color }) => {
    const project = await todoistClient.addProject({ name, parentId: parent_id, color: color as ColorKey });
    return {
      content: [
        {
          type: "text" as const,
          text: `Created project: ${project.name} (ID: ${project.id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_update_project",
  "Update an existing project in Todoist by ID",
  {
    id: z.string().describe("ID of the project to update"),
    name: z.string().optional().describe("New name of the project"),
    color: z.string().optional().describe("New color of the project"),
  },
  async ({ id, name, color }) => {
    await todoistClient.updateProject(id, { name, color: color as ColorKey });
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated project ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_delete_project",
  "Delete a project by ID",
  {
    id: z.string().describe("ID of the project to delete"),
  },
  async ({ id }) => {
    await todoistClient.deleteProject(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted project ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_project_tasks",
  "Get tasks associated with a specific Todoist project. Paginates automatically.",
  {
    project_id: z.string().describe("ID of the project to get tasks from"),
  },
  async ({ project_id }) => {
    const allTasks: Awaited<ReturnType<typeof todoistClient.getTasks>>["results"] = [];
    let cursor: string | null | undefined = undefined;
    do {
      const response = await todoistClient.getTasks({ projectId: project_id, cursor: cursor ?? undefined });
      allTasks.push(...response.results);
      cursor = response.nextCursor;
    } while (cursor);

    const taskList = allTasks
      .map(
        (task) =>
          `- ${task.content} (ID: ${task.id})${task.description ? `\n  Description: ${task.description}` : ""}${task.due ? `\n  Due: ${task.due.string}` : ""}${task.priority ? `\n  Priority: ${task.priority}` : ""}${task.labels?.length ? `\n  Labels: ${task.labels.join(", ")}` : ""}${task.addedAt ? `\n  Created: ${task.addedAt}` : ""}`
      )
      .join("\n\n");
    return {
      content: [
        {
          type: "text" as const,
          text: allTasks.length > 0 ? taskList : `No tasks found for project ID: ${project_id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_project_collaborators",
  "Get collaborators for a specific project",
  {
    project_id: z.string().describe("ID of the project"),
  },
  async ({ project_id }) => {
    const response = await todoistClient.getProjectCollaborators(project_id);
    const collaborators = response.results;
    const collabList = collaborators.map((collab) => `- ${collab.name} (${collab.email})`).join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: collaborators.length > 0 ? collabList : "No collaborators found.",
        },
      ],
    };
  }
);

// ===================
// SECTION TOOLS
// ===================

server.tool(
  "todoist_get_sections",
  "Get all sections or sections for a specific project",
  {
    project_id: z.string().optional().describe("ID of the project to get sections from"),
  },
  async ({ project_id }) => {
    const response = await todoistClient.getSections(project_id ? { projectId: project_id } : undefined);
    const sections = response.results;
    const sectionList = sections
      .map((section) => `- ${section.name} (ID: ${section.id}, Project: ${section.projectId})`)
      .join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: sections.length > 0 ? sectionList : "No sections found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_create_section",
  "Create a new section in a project",
  {
    name: z.string().describe("Name of the section"),
    project_id: z.string().describe("ID of the project"),
    order: z.number().optional().describe("Order of the section"),
  },
  async ({ name, project_id, order }) => {
    const section = await todoistClient.addSection({ name, projectId: project_id, order });
    return {
      content: [
        {
          type: "text" as const,
          text: `Created section: ${section.name} (ID: ${section.id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_section",
  "Get a specific section by ID",
  {
    id: z.string().describe("ID of the section"),
  },
  async ({ id }) => {
    const section = await todoistClient.getSection(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Section: ${section.name} (ID: ${section.id}, Project: ${section.projectId})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_update_section",
  "Update a section by ID",
  {
    id: z.string().describe("ID of the section to update"),
    name: z.string().describe("New name of the section"),
  },
  async ({ id, name }) => {
    await todoistClient.updateSection(id, { name });
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated section ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_delete_section",
  "Delete a section by ID",
  {
    id: z.string().describe("ID of the section to delete"),
  },
  async ({ id }) => {
    await todoistClient.deleteSection(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted section ID: ${id}`,
        },
      ],
    };
  }
);

// ===================
// COMMENT TOOLS
// ===================

server.tool(
  "todoist_get_comments",
  "Get all comments for a task or project",
  {
    task_id: z.string().optional().describe("ID of the task"),
    project_id: z.string().optional().describe("ID of the project"),
  },
  async ({ task_id, project_id }) => {
    if (!task_id && !project_id) {
      throw new Error("Either task_id or project_id is required");
    }
    let response;
    if (task_id) {
      response = await todoistClient.getComments({ taskId: task_id });
    } else {
      response = await todoistClient.getComments({ projectId: project_id! });
    }
    const comments = response.results;
    const commentList = comments.map((comment) => `- ${comment.content} (posted: ${comment.postedAt})`).join("\n\n");
    return {
      content: [
        {
          type: "text" as const,
          text: comments.length > 0 ? commentList : "No comments found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_create_comment",
  "Create a new comment on a task or project",
  {
    content: z.string().describe("Content of the comment"),
    task_id: z.string().optional().describe("ID of the task"),
    project_id: z.string().optional().describe("ID of the project"),
  },
  async ({ content, task_id, project_id }) => {
    if (!task_id && !project_id) {
      throw new Error("Either task_id or project_id is required");
    }
    const commentArgs: any = { content };
    if (task_id) commentArgs.taskId = task_id;
    if (project_id) commentArgs.projectId = project_id;
    const comment = await todoistClient.addComment(commentArgs);
    return {
      content: [
        {
          type: "text" as const,
          text: `Created comment: "${comment.content}"`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_update_comment",
  "Update a comment by ID",
  {
    id: z.string().describe("ID of the comment to update"),
    content: z.string().describe("New content of the comment"),
  },
  async ({ id, content }) => {
    await todoistClient.updateComment(id, { content });
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated comment ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_delete_comment",
  "Delete a comment by ID",
  {
    id: z.string().describe("ID of the comment to delete"),
  },
  async ({ id }) => {
    await todoistClient.deleteComment(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted comment ID: ${id}`,
        },
      ],
    };
  }
);

// ===================
// LABEL TOOLS
// ===================

server.tool(
  "todoist_get_labels",
  "Get all personal labels. Paginates automatically.",
  {},
  async () => {
    const allLabels: Awaited<ReturnType<typeof todoistClient.getLabels>>["results"] = [];
    let cursor: string | null | undefined = undefined;
    do {
      const response = await todoistClient.getLabels({ cursor: cursor ?? undefined });
      allLabels.push(...response.results);
      cursor = response.nextCursor;
    } while (cursor);

    const labelList = allLabels
      .map((label) => `- ${label.name} (ID: ${label.id}${label.color ? `, Color: ${label.color}` : ""}${label.isFavorite ? ", Favorite" : ""})`)
      .join("\n");
    return {
      content: [
        {
          type: "text" as const,
          text: allLabels.length > 0 ? labelList : "No labels found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_create_label",
  "Create a new personal label",
  {
    name: z.string().describe("Name of the label"),
    color: z.string().optional().describe("Color of the label"),
    order: z.number().optional().describe("Order of the label"),
    is_favorite: z.boolean().optional().describe("Whether the label is a favorite"),
  },
  async ({ name, color, order, is_favorite }) => {
    const label = await todoistClient.addLabel({ name, color: color as ColorKey, order, isFavorite: is_favorite });
    return {
      content: [
        {
          type: "text" as const,
          text: `Created label: ${label.name} (ID: ${label.id})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_get_label",
  "Get a specific label by ID",
  {
    id: z.string().describe("ID of the label"),
  },
  async ({ id }) => {
    const label = await todoistClient.getLabel(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Label: ${label.name} (ID: ${label.id}${label.color ? `, Color: ${label.color}` : ""})`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_update_label",
  "Update a label by ID",
  {
    id: z.string().describe("ID of the label to update"),
    name: z.string().optional().describe("New name of the label"),
    color: z.string().optional().describe("New color of the label"),
    order: z.number().optional().describe("New order of the label"),
    is_favorite: z.boolean().optional().describe("Whether the label is a favorite"),
  },
  async ({ id, name, color, order, is_favorite }) => {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (color) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (is_favorite !== undefined) updateData.isFavorite = is_favorite;
    await todoistClient.updateLabel(id, updateData);
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated label ID: ${id}`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_delete_label",
  "Delete a label by ID",
  {
    id: z.string().describe("ID of the label to delete"),
  },
  async ({ id }) => {
    await todoistClient.deleteLabel(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted label ID: ${id}`,
        },
      ],
    };
  }
);

// ===================
// SHARED LABEL TOOLS
// ===================

server.tool(
  "todoist_get_shared_labels",
  "Get all shared labels",
  {},
  async () => {
    const response = await todoistClient.getSharedLabels();
    const sharedLabels = response.results;
    const labelList = sharedLabels.join(", ");
    return {
      content: [
        {
          type: "text" as const,
          text: sharedLabels.length > 0 ? `Shared labels: ${labelList}` : "No shared labels found.",
        },
      ],
    };
  }
);

server.tool(
  "todoist_rename_shared_labels",
  "Rename shared labels",
  {
    name: z.string().describe("Current name of the shared label"),
    new_name: z.string().describe("New name for the shared label"),
  },
  async ({ name, new_name }) => {
    await todoistClient.renameSharedLabel({ name, newName: new_name });
    return {
      content: [
        {
          type: "text" as const,
          text: `Renamed shared label "${name}" to "${new_name}"`,
        },
      ],
    };
  }
);

server.tool(
  "todoist_remove_shared_labels",
  "Remove shared labels",
  {
    name: z.string().describe("Name of the shared label to remove"),
  },
  async ({ name }) => {
    await todoistClient.removeSharedLabel({ name });
    return {
      content: [
        {
          type: "text" as const,
          text: `Removed shared label: "${name}"`,
        },
      ],
    };
  }
);

// ===================
// START SERVER
// ===================

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Todoist MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
