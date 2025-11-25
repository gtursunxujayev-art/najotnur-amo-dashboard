import { NextResponse } from "next/server";
import {
  getAllExtensionMappings,
  updateExtensionMapping,
} from "@/lib/extensionMapping";

export const dynamic = "force-dynamic";

/**
 * GET: View all extension-to-manager mappings
 * Returns current mappings and instructions for updating
 * 
 * Example:
 * GET /api/config/extension-mapping
 */
export async function GET(request: Request) {
  try {
    const mappings = getAllExtensionMappings();

    return NextResponse.json({
      success: true,
      data: {
        extensionMappings: mappings,
        total: Object.keys(mappings).length,
        instructions: {
          view: "GET /api/config/extension-mapping",
          add_or_update: "POST /api/config/extension-mapping",
          example_body: '{"extension": "102", "managerName": "Diyorbek"}',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Update or add extension mapping
 * Maps an extension number to a manager name
 * 
 * Example:
 * POST /api/config/extension-mapping
 * {"extension": "102", "managerName": "Diyorbek"}
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { extension, managerName } = body;

    if (!extension || !managerName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing extension or managerName in request body",
          example: '{"extension": "102", "managerName": "Diyorbek"}',
        },
        { status: 400 }
      );
    }

    updateExtensionMapping(String(extension), managerName);

    const updatedMappings = getAllExtensionMappings();

    return NextResponse.json({
      success: true,
      message: `Extension ${extension} mapped to ${managerName}`,
      data: {
        updatedExtension: { extension, managerName },
        allMappings: updatedMappings,
        total: Object.keys(updatedMappings).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
