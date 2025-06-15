

export default function Emoji() {
    <>
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* <!-- Background circle for face --> */}
            <circle cx="50" cy="50" r="35" fill="#FFF3A0" stroke="#FFD700" stroke-width="2"/>
            
            {/* <!-- Eyes --> */}
            <circle cx="40" cy="42" r="4" fill="#333"/>
            <circle cx="60" cy="42" r="4" fill="#333"/>
            
            {/* <!-- Smile --> */}
            <path d="M 35 58 Q 50 70 65 58" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            
            {/* <!-- Scanning lines/detection indicators --> */}
            <g opacity="0.7">
                {/* <!-- Top left corner --> */}
                <path d="M 10 10 L 25 10 M 10 10 L 10 25" stroke="#00BFFF" stroke-width="3" stroke-linecap="round"/>
                
                {/* <!-- Top right corner --> */}
                <path d="M 75 10 L 90 10 M 90 10 L 90 25" stroke="#00BFFF" stroke-width="3" stroke-linecap="round"/>
                
                {/* <!-- Bottom left corner --> */}
                <path d="M 10 75 L 10 90 M 10 90 L 25 90" stroke="#00BFFF" stroke-width="3" stroke-linecap="round"/>
                
                {/* <!-- Bottom right corner --> */}
                <path d="M 75 90 L 90 90 M 90 90 L 90 75" stroke="#00BFFF" stroke-width="3" stroke-linecap="round"/>
            </g>
            
            {/* <!-- Scanning beam effect --> */}
            <g opacity="0.4">
                <line x1="15" y1="30" x2="85" y2="30" stroke="#00BFFF" stroke-width="1"/>
                <line x1="15" y1="50" x2="85" y2="50" stroke="#00BFFF" stroke-width="1"/>
                <line x1="15" y1="70" x2="85" y2="70" stroke="#00BFFF" stroke-width="1"/>
            </g>
            
            {/* <!-- Detection dots/indicators --> */}
            <g opacity="0.8">
                <circle cx="25" cy="20" r="2" fill="#FF6B6B"/>
                <circle cx="75" cy="20" r="2" fill="#4ECDC4"/>
                <circle cx="20" cy="80" r="2" fill="#45B7D1"/>
                <circle cx="80" cy="80" r="2" fill="#96CEB4"/>
            </g>
            
            {/* <!-- Pulse effect around face --> */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#00BFFF" stroke-width="1" opacity="0.3" stroke-dasharray="5,5">
                <animate attributeName="r" values="40;45;40" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
            </circle>
        </svg>
    </>
}