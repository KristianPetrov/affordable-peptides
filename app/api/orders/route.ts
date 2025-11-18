import { NextRequest, NextResponse } from "next/server";
import { createOrderAction } from "@/app/actions/orders";

/**
 * @deprecated Use Server Actions instead (createOrderAction)
 * This API route is kept for backwards compatibility
 */
export async function POST (request: NextRequest)
{
    try {
        const body = await request.json();

        const result = await createOrderAction(body);

        if (result.success) {
            return NextResponse.json({
                orderId: result.orderId,
                orderNumber: result.orderNumber,
            });
        }

        const responseInit: ResponseInit = {
            status: result.errorCode === "RATE_LIMITED" ? 429 : 400,
        };

        if (result.errorCode === "RATE_LIMITED" && result.retryAfterSeconds) {
            responseInit.headers = {
                "Retry-After": String(result.retryAfterSeconds),
            };
        }

        return NextResponse.json({ error: result.error }, responseInit);
    } catch (error) {
        console.error("Error creating order:", error);
        return NextResponse.json(
            { error: "Failed to create order" },
            { status: 500 }
        );
    }
}

