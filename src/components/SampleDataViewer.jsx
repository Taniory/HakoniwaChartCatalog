import { useEffect, useMemo, useState } from "react";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toCellValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function normalizeRows(data) {
    if (Array.isArray(data)) {
        if (data.every((item) => isPlainObject(item))) {
            return data;
        }
        return data.map((value) => ({ value }));
    }

    if (isPlainObject(data)) {
        if (
            Array.isArray(data.rows) &&
            data.rows.every((item) => isPlainObject(item))
        ) {
            return data.rows;
        }
        if (
            Array.isArray(data.data) &&
            data.data.every((item) => isPlainObject(item))
        ) {
            return data.data;
        }
        return [data];
    }

    return [];
}

export default function SampleDataViewer({ data }) {
    const [viewMode, setViewMode] = useState("table");
    const [sorting, setSorting] = useState([]);

    useEffect(() => {
        setViewMode("table");
    }, [data]);

    const allRows = useMemo(() => normalizeRows(data), [data]);
    const maxRows = 200;
    const visibleRows = useMemo(() => allRows.slice(0, maxRows), [allRows]);

    const columns = useMemo(() => {
        const keySet = new Set();
        visibleRows.forEach((row) => {
            Object.keys(row).forEach((key) => {
                keySet.add(key);
            });
        });

        const columnKeys = keySet.size > 0 ? [...keySet] : ["value"];
        return columnKeys.map((key) => ({
            accessorKey: key,
            header: key,
            cell: (info) => toCellValue(info.getValue()),
        }));
    }, [visibleRows]);

    const table = useReactTable({
        data: visibleRows,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div>
            <div className="sample-view-toggle" role="tablist" aria-label="Sample data view">
                <button
                    type="button"
                    className={`sample-view-button ${viewMode === "table" ? "active" : ""}`}
                    onClick={() => {
                        setViewMode("table");
                    }}
                >
                    Table
                </button>
                <button
                    type="button"
                    className={`sample-view-button ${viewMode === "json" ? "active" : ""}`}
                    onClick={() => {
                        setViewMode("json");
                    }}
                >
                    JSON
                </button>
            </div>

            {viewMode === "table" ? (
                visibleRows.length > 0 ? (
                    <div className="sample-table-wrap">
                        <table className="sample-table">
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th key={header.id}>
                                                {header.isPlaceholder ? null : (
                                                    <button
                                                        type="button"
                                                        className="sample-sort-button"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                        <span className="sample-sort-indicator">
                                                            {header.column.getIsSorted() === "asc"
                                                                ? " ▲"
                                                                : header.column.getIsSorted() === "desc"
                                                                  ? " ▼"
                                                                  : " ↕"}
                                                        </span>
                                                    </button>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map((row) => (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="sample-empty">Table view is unavailable for this data.</p>
                )
            ) : (
                <div className="sample-json-wrap">
                    <JsonView
                        data={data ?? {}}
                        shouldExpandNode={allExpanded}
                        style={darkStyles}
                    />
                </div>
            )}

            {allRows.length > visibleRows.length ? (
                <p className="sample-note">
                    Showing first {visibleRows.length} / {allRows.length} rows.
                </p>
            ) : null}
        </div>
    );
}
