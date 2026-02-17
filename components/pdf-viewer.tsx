'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker 
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PdfViewerProps {
    url: string | null;
}

export function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(!!url);
    }, [url]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
    }

    if (!url) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900 text-muted-foreground">
                No PDF to display
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-auto">
            <div className="flex-1 flex justify-center p-4">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading PDF...
                        </div>
                    }
                    error={
                        <div className="text-red-500">Failed to load PDF.</div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        width={600} // Fixed width for now, could be responsive
                        className="shadow-lg"
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                </Document>
            </div>

            {numPages > 1 && (
                <div className="flex justify-center gap-4 py-2 bg-white dark:bg-slate-900 border-t">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(p => p - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span className="flex items-center">
                        Page {pageNumber} of {numPages}
                    </span>
                    <button
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(p => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
