import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeaders, createAuthError } from "@/utils/supabase/auth";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
    try {
        // Get authenticated user
        const user = getUserFromHeaders(req);

        if (!user) {
            return createAuthError('Authentication required to fetch extraction result');
        }

        // Get requestId from query params
        const { searchParams } = new URL(req.url);
        const requestId = searchParams.get('id');

        if (!requestId) {
            return NextResponse.json(
                { error: "Missing required parameter: id" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch queue item (with user_id check for security)
        const { data: queueItem, error: queueError } = await supabase
            .from('extraction_queue')
            .select('id, video_url, status, created_at')
            .eq('id', requestId)
            .eq('user_id', user.id)
            .single();

        if (queueError || !queueItem) {
            return NextResponse.json(
                {
                    error: "Extraction not found",
                    details: "The requested extraction does not exist or you don't have access"
                },
                { status: 404 }
            );
        }

        // If not completed, return status only
        if (queueItem.status !== 'completed') {
            return NextResponse.json({
                success: true,
                status: queueItem.status,
                videoUrl: queueItem.video_url,
                createdAt: queueItem.created_at,
                data: null
            }, { status: 200 });
        }

        // Fetch result data for completed items
        const { data: resultItem, error: resultError } = await supabase
            .from('extraction_results')
            .select('data, error_message, created_at')
            .eq('queue_id', requestId)
            .single();

        if (resultError) {
            console.error('[YouTube Result] Result fetch error:', resultError);
            return NextResponse.json({
                success: true,
                status: queueItem.status,
                videoUrl: queueItem.video_url,
                createdAt: queueItem.created_at,
                data: null,
                error: "Result data not found"
            }, { status: 200 });
        }

        // Check if there was an error during extraction
        if (resultItem.error_message) {
            return NextResponse.json({
                success: false,
                status: 'failed',
                videoUrl: queueItem.video_url,
                createdAt: queueItem.created_at,
                error: resultItem.error_message
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            status: 'completed',
            videoUrl: queueItem.video_url,
            createdAt: queueItem.created_at,
            data: resultItem.data
        }, { status: 200 });

    } catch (error) {
        console.error('[YouTube Result] Error:', error);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
