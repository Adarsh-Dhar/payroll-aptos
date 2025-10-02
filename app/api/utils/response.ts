import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message })
  }, { status });
}

export function errorResponse(
  message: string,
  status: number = 400,
  errors?: unknown[]
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    message,
    ...(errors && { errors })
  }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
}

export function notFoundResponse(resource: string): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

export function validationErrorResponse(errors: unknown[]): NextResponse<ApiResponse> {
  return errorResponse('Validation failed', 400, errors);
}

export function internalServerErrorResponse(message: string = 'Internal server error'): NextResponse<ApiResponse> {
  return errorResponse(message, 500);
}

export function conflictResponse(message: string, data?: unknown): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    message,
    ...(data && { data })
  }, { status: 409 });
}
