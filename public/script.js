// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeDocsTabs();
    initializeLiveDemo();
    initializeSmoothScrolling();
});

// Navigation
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger?.classList.remove('active');
            navMenu?.classList.remove('active');
        });
    });

    // Highlight active navigation item on scroll
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === current) {
                link.classList.add('active');
            }
        });
    });
}

// Documentation tabs
function initializeDocsTabs() {
    const docsTabs = document.querySelectorAll('.docs-tab');
    const docsTabContents = document.querySelectorAll('.docs-tab-content');

    docsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            docsTabs.forEach(t => t.classList.remove('active'));
            docsTabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Live demo functionality
function initializeLiveDemo() {
    const scanBtn = document.getElementById('scan-btn');
    const infoBtn = document.getElementById('info-btn');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const targetInput = document.getElementById('target');
    const flagsInput = document.getElementById('flags');

    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            const target = targetInput?.value || 'scanme.nmap.org';
            const flags = flagsInput?.value || '-T4 -F';
            
            await performScan(target, flags);
        });
    }

    if (infoBtn) {
        infoBtn.addEventListener('click', async () => {
            await getServerInfo();
        });
    }

    async function performScan(target, flags) {
        showLoading(true);
        updateOutput('Initiating scan...', 'info');

        try {
            const request = {
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: {
                    name: "nmapScan",
                    arguments: {
                        target: target,
                        flags: flags
                    }
                }
            };

            const response = await fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.error) {
                updateOutput(`Error: ${result.error.message || 'Unknown error occurred'}`, 'error');
            } else if (result.result && result.result.content && result.result.content[0]) {
                updateOutput(result.result.content[0].text, 'success');
            } else {
                updateOutput('Scan completed but no results returned', 'warning');
            }

        } catch (error) {
            console.error('Scan failed:', error);
            updateOutput(`Scan failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function getServerInfo() {
        showLoading(true);
        updateOutput('Getting server information...', 'info');

        try {
            const request = {
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: {
                    name: "getInfo",
                    arguments: {}
                }
            };

            const response = await fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.error) {
                updateOutput(`Error: ${result.error.message || 'Unknown error occurred'}`, 'error');
            } else if (result.result && result.result.content && result.result.content[0]) {
                updateOutput(result.result.content[0].text, 'success');
            } else {
                updateOutput('Request completed but no information returned', 'warning');
            }

        } catch (error) {
            console.error('Info request failed:', error);
            updateOutput(`Info request failed: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    function showLoading(show) {
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
        
        // Disable/enable buttons
        if (scanBtn) scanBtn.disabled = show;
        if (infoBtn) infoBtn.disabled = show;
        
        // Update button text
        if (show) {
            if (scanBtn) {
                scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
            }
        } else {
            if (scanBtn) {
                scanBtn.innerHTML = '<i class="fas fa-search"></i> Start Scan';
            }
        }
    }

    function updateOutput(text, type = 'info') {
        if (!output) return;

        // Clear previous content
        output.innerHTML = '';

        // Create code element
        const code = document.createElement('code');
        code.textContent = text;
        
        // Add type-specific styling
        switch(type) {
            case 'success':
                code.style.color = '#00ff88';
                break;
            case 'error':
                code.style.color = '#ff4444';
                break;
            case 'warning':
                code.style.color = '#ffaa00';
                break;
            default:
                code.style.color = '#b0b0b0';
        }

        output.appendChild(code);

        // Scroll to bottom of output
        const outputContainer = output.closest('.output-container');
        if (outputContainer) {
            outputContainer.scrollTop = outputContainer.scrollHeight;
        }
    }
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Intersection Observer for animation on scroll
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements that should animate in
    const animateElements = document.querySelectorAll('.feature-card, .step, .api-section, .example');
    animateElements.forEach(el => observer.observe(el));
}

// Copy code functionality
function initializeCodeCopy() {
    // Add copy buttons to code blocks
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(block => {
        const pre = block.parentElement;
        
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy to clipboard';
        
        // Position button
        pre.style.position = 'relative';
        copyBtn.style.position = 'absolute';
        copyBtn.style.top = '10px';
        copyBtn.style.right = '10px';
        copyBtn.style.background = 'rgba(0, 212, 170, 0.2)';
        copyBtn.style.border = '1px solid var(--primary-color)';
        copyBtn.style.color = 'var(--primary-color)';
        copyBtn.style.padding = '8px';
        copyBtn.style.borderRadius = '4px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.fontSize = '12px';
        
        // Add click handler
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(block.textContent);
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.style.color = '#00ff88';
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    copyBtn.style.color = 'var(--primary-color)';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        });
        
        pre.appendChild(copyBtn);
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollAnimations();
    initializeCodeCopy();
});

// Handle hamburger menu animation
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // Animate hamburger bars
            const bars = this.querySelectorAll('.bar');
            if (this.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    }
});

// Add some visual feedback for form interactions
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input[type="text"]');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.2s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
});

// Terminal cursor animation enhancement
document.addEventListener('DOMContentLoaded', function() {
    const terminalLines = document.querySelectorAll('.terminal-line');
    
    // Animate terminal lines appearing one by one
    terminalLines.forEach((line, index) => {
        line.style.opacity = '0';
        line.style.animation = `fadeInUp 0.5s ease-out ${index * 0.2}s forwards`;
    });
});

// Add CSS for additional animations
const additionalStyles = `
    .animate-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    .copy-btn:hover {
        background: rgba(0, 212, 170, 0.3) !important;
        transform: scale(1.1);
        transition: all 0.2s ease;
    }
    
    .feature-card {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease;
    }
    
    .feature-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
    }
    
    .btn:disabled:hover {
        transform: none !important;
        box-shadow: none !important;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet); 