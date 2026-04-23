import { auth } from "@/lib/auth";
import {
  createFolder,
  getFolderById,
  type DriveNode,
} from "@/lib/queries";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

export interface CreateFolderResponse {
  folder: DriveNode;
}

export interface CreateFolderError {
  error: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<CreateFolderResponse | CreateFolderError>> {
  // Get session to identify the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Parse request body
    const body: CreateFolderRequest = await request.json();
    const { name, parentId } = body;

    // Validate folder name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Folder name must be less than 255 characters" },
        { status: 400 }
      );
    }

    // If parentId is provided, verify the parent folder exists and belongs to the user
    if (parentId) {
      const parentFolder = await getFolderById(parentId, userId);
      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    // Create the folder
    const folder = await createFolder(name, parentId, userId);

    const response: CreateFolderResponse = {
      folder,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Create folder API error:", error);

    // Handle specific error messages from createFolder
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
