import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Phone, Globe, User, Shield } from 'lucide-react';
import { useSubmitContact } from '@workspace/api-client-react';
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
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email address is required'),
  caseSummary: z.string().min(10, 'Please provide a brief case summary'),
  preferredContact: z.string().optional(),
  bestTime: z.string().optional(),
});

export default function Contact() {
  const [isSuccess, setIsSuccess] = useState(false);
  const submitContact = useSubmitContact();
  const { status: consentStatus } = useCookieConsent();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      caseSummary: '',
      preferredContact: '',
      bestTime: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitContact.mutate({
      data: {
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        caseSummary: values.caseSummary,
        preferredContact: values.preferredContact || null,
        bestTime: values.bestTime || null,
      }
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        form.reset();
        if (consentStatus === 'accepted') {
          trackEvent('contact_form_submitted');
        }
      }
    });
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
                  <h3 className="font-serif text-2xl font-bold mb-4">Request Received</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Thank you for contacting Stonegate Intelligence Group. Your request has been received and will be reviewed confidentially. We will be in touch shortly.
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-white/5 p-8 md:p-10">
                  <h2 className="font-serif text-2xl font-bold mb-8 text-foreground border-b border-white/10 pb-4">Secure Intake Form</h2>
                  
                  {submitContact.isError && (
                    <div className="mb-8 p-4 bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                      There was an error submitting your request. Please try again or contact us directly.
                    </div>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        disabled={submitContact.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 uppercase tracking-widest text-sm font-semibold transition-all disabled:opacity-50 mt-4"
                      >
                        {submitContact.isPending ? "Submitting..." : "Submit Secure Request"}
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

