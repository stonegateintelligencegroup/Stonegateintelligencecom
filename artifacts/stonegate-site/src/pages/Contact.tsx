import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Phone, Globe, User, Shield } from 'lucide-react';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { trackEvent } from '@/lib/analytics';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  clientType: z.string().min(1, 'Please select a client type'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email address is required'),
  caseSummary: z.string().min(10, 'Please provide a brief case summary'),
  preferredContact: z.string().optional(),
  bestTime: z.string().optional(),
});

const CLIENT_TYPES = [
  { value: "individual", icon: "👤", label: "Individual", desc: "Private individual seeking personal investigative or research services" },
  { value: "attorney",   icon: "⚖️", label: "Attorney / Law Firm", desc: "Attorney or law firm seeking litigation support, due diligence, or investigative assistance" },
  { value: "business",   icon: "🏢", label: "Company",   desc: "Corporation, LLC, or other business entity seeking intelligence or investigative services" },
];

export default function Contact() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { status: consentStatus } = useCookieConsent();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientType: '',
      fullName: '',
      phone: '',
      email: '',
      caseSummary: '',
      preferredContact: '',
      bestTime: '',
    },
  });

  const selectedClientType = form.watch("clientType");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const subject = `Consultation request from ${values.fullName}`;
    const body = [
      `Name: ${values.fullName}`,
      `Phone: ${values.phone}`,
      `Email: ${values.email}`,
      `Client type: ${values.clientType}`,
      `Preferred contact: ${values.preferredContact || 'Not specified'}`,
      `Best time: ${values.bestTime || 'Not specified'}`,
      '',
      'Case summary:',
      values.caseSummary,
    ].join('\n');

    window.location.href =
      `mailto:Monica.Morgado@stonegateintelligence.com?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    setIsSuccess(true);
    form.reset();
    if (consentStatus === 'accepted') {
      trackEvent('contact_form_submitted');
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="w-full flex flex-col pt-20">
      {/* Header */}
      <section className="py-20 bg-card relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-sacred-geometry opacity-5" />
        <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="max-w-3xl mx-auto">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-wide mb-6">
              Request a Consultation
            </h1>
            <div className="w-16 h-1 bg-primary mx-auto mb-8" />
            <p className="text-xl text-muted-foreground leading-relaxed">
              Strict confidentiality is maintained from the moment you reach out.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-16">
            
            {/* Form Column */}
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              variants={fadeIn} 
              className="lg:w-2/3"
            >
              {isSuccess ? (
                <div className="bg-card border border-primary/30 p-12 text-center h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold mb-4">Your Email Is Ready</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Your email application should have opened with your consultation details. Send the message to complete your request, or contact us directly by phone or email.
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-white/5 p-8 md:p-10">
                  <h2 className="font-serif text-2xl font-bold mb-8 text-foreground border-b border-white/10 pb-4">Secure Intake Form</h2>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                      {/* Client type cards */}
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                          I am contacting Stonegate as a… <span className="text-primary">*</span>
                        </p>
                        <p className="text-xs text-muted-foreground/50 mb-3">Select the option that best describes you.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {CLIENT_TYPES.map(ct => (
                            <button
                              key={ct.value}
                              type="button"
                              onClick={() => form.setValue("clientType", ct.value, { shouldValidate: true })}
                              className={`relative text-left p-4 rounded border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                                selectedClientType === ct.value
                                  ? "border-primary bg-primary/8 shadow-[0_0_0_1px_rgba(192,57,43,0.1)]"
                                  : "border-white/10 bg-background hover:border-white/25 hover:bg-white/4"
                              }`}
                            >
                              {selectedClientType === ct.value && (
                                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                  <Shield className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                              <span className="block text-xl mb-2">{ct.icon}</span>
                              <span className="block text-sm font-semibold text-foreground mb-1">{ct.label}</span>
                              <span className="block text-xs text-muted-foreground/60 leading-relaxed">{ct.desc}</span>
                            </button>
                          ))}
                        </div>
                        {form.formState.errors.clientType && (
                          <p className="text-xs text-destructive mt-2">{form.formState.errors.clientType.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" className="bg-background border-white/10 focus-visible:ring-primary" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Phone Number *</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 555-5555" className="bg-background border-white/10 focus-visible:ring-primary" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" className="bg-background border-white/10 focus-visible:ring-primary" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caseSummary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Brief Case Summary *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Please provide a brief overview of the situation..." 
                                className="bg-background border-white/10 focus-visible:ring-primary min-h-[150px] resize-y" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="preferredContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Contact Method</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background border-white/10 focus:ring-primary">
                                    <SelectValue placeholder="Select method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-card border-white/10">
                                  <SelectItem value="Phone">Phone</SelectItem>
                                  <SelectItem value="Email">Email</SelectItem>
                                  <SelectItem value="Either">Either</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bestTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground">Best Time To Reach You</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Weekdays after 5pm" className="bg-background border-white/10 focus-visible:ring-primary" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 uppercase tracking-widest text-sm font-semibold transition-all disabled:opacity-50 mt-4"
                      >
                        Open Email to Submit
                      </button>
                    </form>
                  </Form>
                </div>
              )}
            </motion.div>

            {/* Info Column */}
            <motion.div 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              variants={fadeIn} 
              className="lg:w-1/3"
            >
              <div className="sticky top-32 space-y-10">
                <div>
                  <h3 className="font-sans text-sm tracking-[0.3em] text-secondary uppercase mb-6">Direct Contact</h3>
                  <div className="w-8 h-px bg-primary mb-6" />
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <User className="w-5 h-5 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">Monica Morgado</p>
                        <p className="text-sm text-muted-foreground">Founder & Managing Director</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <Phone className="w-5 h-5 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">Phone</p>
                        <p className="text-sm text-muted-foreground">509-599-5488</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <Mail className="w-5 h-5 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">Email</p>
                        <a href="mailto:Monica.Morgado@stonegateintelligence.com" className="text-sm text-muted-foreground hover:text-primary transition-colors break-all">
                          Monica.Morgado@stonegateintelligence.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Globe className="w-5 h-5 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">Website</p>
                        <p className="text-sm text-muted-foreground">stonegateintelligence.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-6 border-l-2 border-secondary">
                  <h4 className="font-serif font-bold text-lg mb-2">Confidentiality Guarantee</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All inquiries, consultations, and communications are held in strict confidence, regardless of whether you choose to retain our services.
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}
