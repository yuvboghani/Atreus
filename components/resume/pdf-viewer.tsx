'use client'

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    url: string | null;
}

export function PDFViewer({ url }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    if (!url) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-100 dark:bg-slate-800">
                No PDF selected
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto flex justify-center bg-slate-200 dark:bg-slate-900 p-4">
            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                className="shadow-2xl"
            >
                {Array.from(new Array(numPages), (el, index) => (
                    <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        scale={1.2}
                        className="mb-4"
                    />
                ))}
            </Document>
        </div>
    );
}
