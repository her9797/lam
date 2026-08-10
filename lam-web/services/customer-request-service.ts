export type CustomerRequestStatus = "pending" | "checked" | "completed";
export type CustomerRequestGender = "male" | "female";

export type CustomerRequest = {
  id: string;
  text: string;
  status: CustomerRequestStatus;
  createdAt: string;
  handledAt?: string;
};

export type CustomerRequestInput = {
  text: string;
};

export type SpecialRequest = {
  id: string;
  gender: CustomerRequestGender;
  name: string;
  age: string;
  residence: string;
  instagram: string;
  idealType: string;
  text: string;
  createdAt: string;
};

export type SpecialRequestInput = Omit<SpecialRequest, "id" | "createdAt">;

async function readError(response: Response) {
  const errorBody = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return errorBody?.error ?? `request failed: ${response.status}`;
}

export async function createCustomerRequest(payload: CustomerRequestInput) {
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

export async function createSpecialRequest(payload: SpecialRequestInput) {
  const response = await fetch("/api/special-requests", {
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

export async function listSpecialRequests(): Promise<SpecialRequest[]> {
  const response = await fetch("/api/admin/special-requests", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as SpecialRequest[];
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

export async function deleteSpecialRequest(
  specialRequestId: string,
): Promise<SpecialRequest[]> {
  const response = await fetch(`/api/admin/special-requests/${specialRequestId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as SpecialRequest[];
}
