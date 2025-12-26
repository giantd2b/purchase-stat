import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionsClient } from "@/app/transactions/TransactionsClient";
import type { PaginatedTransactions, FilterOptions } from "@/lib/transactions-db";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================
// Mock Data
// ============================================

const mockTransactions: PaginatedTransactions = {
  transactions: [
    {
      id: 1,
      date: new Date("2025-12-26"),
      reference: "REF-001",
      vendor: "Test Vendor",
      productName: "Test Product",
      totalPrice: 1000,
      actualPrice: null,
      overrideReason: null,
      payment: "เงินสด",
      minorGroup: "Kitchen",
      isManual: false,
    },
    {
      id: -1,
      date: new Date("2025-12-26"),
      reference: "MANUAL-001",
      vendor: "Manual Vendor",
      productName: "Manual Product",
      totalPrice: 500,
      actualPrice: null,
      overrideReason: null,
      payment: "โอน",
      minorGroup: "HR",
      isManual: true,
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 2,
    totalPages: 1,
  },
  stats: {
    pageAmount: 1500,
  },
};

const mockFilterOptions: FilterOptions = {
  vendors: ["Vendor A", "Vendor B", "Test Vendor"],
  payments: ["เงินสด", "โอน", "บัตรเครดิต"],
  departments: ["Kitchen", "HR", "Engineering"],
};

const mockCurrentFilters = {
  startDate: "2025-12-26",
  endDate: "2025-12-26",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// Rendering Tests
// ============================================

describe("TransactionsClient", () => {
  it("should render filter section", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("ตัวกรอง")).toBeInTheDocument();
    expect(screen.getByText("วันที่เริ่มต้น")).toBeInTheDocument();
    expect(screen.getByText("วันที่สิ้นสุด")).toBeInTheDocument();
    expect(screen.getByText("ร้านค้า/ผู้ขาย")).toBeInTheDocument();
    expect(screen.getByText("ประเภทการจ่าย")).toBeInTheDocument();
    // "แผนก" appears multiple times (in filter and table), use getAllByText
    expect(screen.getAllByText("แผนก").length).toBeGreaterThan(0);
  });

  it("should render transaction count", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText(/แสดง 1 - 2 จาก 2 รายการ/)).toBeInTheDocument();
  });

  it("should render page amount", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText(/รวมหน้านี้: 1,500.00 บาท/)).toBeInTheDocument();
  });

  it("should render add transaction button", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("เพิ่มรายการ")).toBeInTheDocument();
  });

  it("should render transaction table", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("Test Vendor")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("Manual Vendor")).toBeInTheDocument();
  });

  it("should render filter and clear buttons", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("กรอง")).toBeInTheDocument();
    expect(screen.getByText("ล้าง")).toBeInTheDocument();
  });
});

// ============================================
// Date Picker Shortcuts Tests
// ============================================

describe("Date Picker Shortcuts", () => {
  it("should render date shortcut buttons when date picker is opened", async () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    // Find and click the start date button
    const startDateButton = screen.getAllByRole("button").find(
      (btn) => btn.textContent?.includes("26 ธ.ค. 2025") || btn.textContent?.includes("Dec")
    );

    if (startDateButton) {
      fireEvent.click(startDateButton);

      // Check for shortcut buttons
      expect(await screen.findByText("เมื่อวาน")).toBeInTheDocument();
      expect(screen.getByText("วันนี้")).toBeInTheDocument();
      expect(screen.getByText("พรุ่งนี้")).toBeInTheDocument();
    }
  });
});

// ============================================
// Pagination Tests
// ============================================

describe("Pagination", () => {
  it("should not render pagination when only one page", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.queryByText("ก่อนหน้า")).not.toBeInTheDocument();
    expect(screen.queryByText("ถัดไป")).not.toBeInTheDocument();
  });

  it("should render pagination when multiple pages", () => {
    const multiPageData: PaginatedTransactions = {
      ...mockTransactions,
      pagination: {
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3,
      },
    };

    render(
      <TransactionsClient
        data={multiPageData}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("ก่อนหน้า")).toBeInTheDocument();
    expect(screen.getByText("ถัดไป")).toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    const multiPageData: PaginatedTransactions = {
      ...mockTransactions,
      pagination: {
        page: 1,
        limit: 50,
        total: 150,
        totalPages: 3,
      },
    };

    render(
      <TransactionsClient
        data={multiPageData}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    const prevButton = screen.getByText("ก่อนหน้า").closest("button");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    const multiPageData: PaginatedTransactions = {
      ...mockTransactions,
      pagination: {
        page: 3,
        limit: 50,
        total: 150,
        totalPages: 3,
      },
    };

    render(
      <TransactionsClient
        data={multiPageData}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    const nextButton = screen.getByText("ถัดไป").closest("button");
    expect(nextButton).toBeDisabled();
  });
});

// ============================================
// Empty State Tests
// ============================================

describe("Empty State", () => {
  it("should render empty state when no transactions", () => {
    const emptyData: PaginatedTransactions = {
      transactions: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      },
      stats: {
        pageAmount: 0,
      },
    };

    render(
      <TransactionsClient
        data={emptyData}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    expect(screen.getByText("ไม่พบรายการที่ตรงกับเงื่อนไข")).toBeInTheDocument();
  });
});

// ============================================
// Manual Transaction Indicator Tests
// ============================================

describe("Manual Transaction Indicator", () => {
  it("should show manual indicator for manual transactions", () => {
    render(
      <TransactionsClient
        data={mockTransactions}
        filterOptions={mockFilterOptions}
        currentFilters={mockCurrentFilters}
      />
    );

    // Manual transaction row should have the hand emoji indicator
    const manualIndicator = screen.getByText("✋");
    expect(manualIndicator).toBeInTheDocument();
  });
});
