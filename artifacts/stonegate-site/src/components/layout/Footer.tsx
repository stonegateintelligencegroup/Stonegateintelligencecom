import { Link } from 'wouter';
import { Mail, Phone, MapPin, Shield } from 'lucide-react';
import logo from '@assets/IMG_2051_1784854999049.jpeg';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 pt-16 pb-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-sacred-geometry opacity-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1 flex flex-col items-start">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-white/10">
                <img src={logo} alt="Stonegate Intelligence Group" className="h-full w-full object-cover" />
              </div>
            </Link>
            <p className="font-serif text-lg text-foreground italic mb-2">
              "Every question deserves an answer grounded in evidence."
            </p>
          </div>
          
          <div>
            <h4 className="font-sans text-sm tracking-[0.2em] text-secondary uppercase mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>509-599-5488</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <a href="mailto:Monica.Morgado@stonegateintelligence.com" className="hover:text-primary transition-colors break-all">
                  Monica.Morgado@stonegateintelligence.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Strictly Confidential</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-sans text-sm tracking-[0.2em] text-secondary uppercase mb-6">Navigation</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
              <li><Link href="/fee-schedule" className="hover:text-primary transition-colors">Fee Schedule</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-sans text-sm tracking-[0.2em] text-secondary uppercase mb-6">Client Access</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/portal" className="hover:text-primary transition-colors">Secure Client Portal</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Request Consultation</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center md:text-left">
            &copy; {new Date().getFullYear()} Stonegate Intelligence Group LLC. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Monica Morgado, Founder & Managing Director
          </p>
        </div>
      </div>
    </footer>
  );
}