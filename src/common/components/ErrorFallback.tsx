import React from 'react'

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
    return (
        <div
            role='alert'
            style={{
                padding: '32px',
                background: '#fff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
        >
            <p
                style={{
                    color: '#dc2626',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: 0,
                }}
            >
                Something went wrong:
            </p>
            <p
                style={{
                    color: '#ef4444',
                    fontSize: '13px',
                    margin: 0,
                    padding: '10px 14px',
                    background: '#fef2f2',
                    borderRadius: '10px',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                }}
            >
                {error.message}
            </p>
            <button
                onClick={resetErrorBoundary}
                style={{
                    alignSelf: 'flex-start',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    background: '#fafafa',
                    color: '#333',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
            >
                Try again
            </button>
        </div>
    )
}
