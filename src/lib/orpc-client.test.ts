import { describe, expect, it } from "vitest";

import { orpcClient, rpcUrl } from "./orpc-client";

describe("Браузерный клиент oRPC", () => {
  it("строит абсолютный адрес RPC от origin окна", () => {
    expect(rpcUrl()).toBe("http://localhost:3000/api/rpc");
  });

  it("содержит процедуры контракта", () => {
    expect(typeof orpcClient.eventTypes.list).toBe("function");
    expect(typeof orpcClient.eventTypes.create).toBe("function");
    expect(typeof orpcClient.availability.get).toBe("function");
    expect(typeof orpcClient.bookings.create).toBe("function");
    expect(typeof orpcClient.bookings.listUpcoming).toBe("function");
  });
});
