export type CustomerRequestStatus = "pending" | "checked" | "completed";
export type CustomerRequestCategory = "direct" | "special";
export type CustomerRequestGender = "male" | "female";

export type CustomerRequest = {
  id: string;
  category: CustomerRequestCategory;
  text: string;
  gender?: CustomerRequestGender;
  name?: string;
  age?: string;
  residence?: string;
  instagram?: string;
  idealType?: string;
  status: CustomerRequestStatus;
  createdAt: string;
  handledAt?: string;
};

export type DirectCustomerRequestInput = {
  category: "direct";
  text: string;
};

export type SpecialCustomerRequestInput = {
  category: "special";
  gender: CustomerRequestGender;
  name: string;
  age: string;
  residence: string;
  instagram: string;
  idealType: string;
  text: string;
};

type CreateCustomerRequestInput =
  | DirectCustomerRequestInput
  | SpecialCustomerRequestInput;

async function readError(response: Response) {
  const errorBody = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return errorBody?.error ?? `request failed: ${response.status}`;
}

export async function createCustomerRequest(payload: CreateCustomerRequestInput) {
  const response = await fetch("/api/customer-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function listCustomerRequests(): Promise<CustomerRequest[]> {
  const response = await fetch("/api/admin/customer-requests", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as CustomerRequest[];
}

export async function updateCustomerRequestStatus(
  customerRequestId: string,
  status: CustomerRequestStatus,
): Promise<CustomerRequest[]> {
  const response = await fetch(`/api/admin/customer-requests/${customerRequestId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as CustomerRequest[];
}

export async function deleteCustomerRequest(
  customerRequestId: string,
): Promise<CustomerRequest[]> {
  const response = await fetch(`/api/admin/customer-requests/${customerRequestId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as CustomerRequest[];
}
