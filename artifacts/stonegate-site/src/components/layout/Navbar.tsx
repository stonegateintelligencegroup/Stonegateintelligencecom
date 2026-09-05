import React from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@assets/IMG_2051_1784854999049.jpeg';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors">
            <img src={logo} alt="Stonegate Intelligence Group Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-semibold tracking-wide text-foreground uppercase leading-tight">
              Stonegate
            </span>
            <span className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase leading-none">
              Intelligence Group
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium tracking-wide uppercase transition-colors hover:text-primary",
                location === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-foreground hover:text-primary transition-colors p-2"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-white/5 py-4 px-4 shadow-2xl">
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block text-sm font-medium tracking-wide uppercase p-3 rounded-md transition-colors",
                  location === link.href ? "bg-white/5 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
