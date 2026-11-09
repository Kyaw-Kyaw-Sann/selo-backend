export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        username: string;
        role: "OWNER" | "CASHIER";
      };
    }
  }
}