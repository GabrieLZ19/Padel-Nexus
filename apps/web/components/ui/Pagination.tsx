"use client";

import { useMemo } from "react";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  currentCount: number;
  onPageChange: (page: number) => void;
  maxButtons?: number;
}

export default function Pagination({
  page,
  total,
  pageSize,
  currentCount,
  onPageChange,
  maxButtons = 5,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageRange = useMemo(() => {
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    return Array.from({ length: maxButtons }, (_, index) => start + index);
  }, [page, totalPages, maxButtons]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
      <div className="text-sm text-gray-400">
        Mostrando {currentCount} de {total} resultados
      </div>

      <div className="inline-flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
        >
          Primera
        </button>

        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
        >
          Anterior
        </button>

        <div className="inline-flex items-center gap-2">
          {pageRange.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-10 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
                pageNumber === page
                  ? "bg-padel-4 text-[#111]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
        >
          Siguiente
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
        >
          Última
        </button>
      </div>
    </div>
  );
}
