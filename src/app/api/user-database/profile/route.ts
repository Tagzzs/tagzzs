import {
  formatValidationErrors,
  profileUpdateSchema,
} from "@/lib/validation/profileUpdateSchema";
import { createAuthError, getUserFromHeaders } from "@/utils/supabase/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let user = getUserFromHeaders(request);

    if (!user) {
      try {
        const { validateSession } = await import("@/utils/supabase/auth");
        const authResult = await validateSession();
        if (authResult.user) {
          user = authResult.user;
        }
      } catch (_sessionError) {
      }
    }
    if (!user) {
      return createAuthError("Authentication required to update profile");
    }

    const _userId = user.id;
    const requestBody = await request.json();
    const validation = profileUpdateSchema.safeParse(requestBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: formatValidationErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const fieldsToUpdate = validation.data;
    const supabase = await createClient();

    const { error } = await supabase
      .from("users")
      .select("*")
      .eq("userid", user.id)
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
          details: error.message || error,
        },
        {
          status: 404,
        }
      );
    }

    const currentTime = new Date().toISOString();

    const profileUpdateData = {
      ...fieldsToUpdate,
      updated_at: currentTime,
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(profileUpdateData)
      .eq("userid", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update profile",
          code: "PROFILE_UPDATE_ERROR",
          details: updateError.message || updateError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedProfile,
      fieldsUpdated: Object.keys(fieldsToUpdate),
      cacheInvalidated: true,
      timestamp: currentTime,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
