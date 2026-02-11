/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                kakao: '#fee500',
                chat: {
                    bg: '#e5e5e5',
                    header: '#f9f9f9',
                    headerEnd: '#f1f1f1',
                    bot: '#f2f2f2',
                }
            },
            boxShadow: {
                'chat': '0 2px 12px #0001',
                'bubble': '0 1px 4px #0001',
            },
            borderRadius: {
                'chat': '16px',
                'bubble': '18px',
            },
            fontFamily: {
                sans: ['"Noto Sans KR"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
