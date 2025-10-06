import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function PlaceOrder() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate consent checkboxes
    if (!transactionalConsent) {
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "Please consent to receive transactional messages to continue."
      });
      return;
    }
    
    if (!marketingConsent) {
      toast({
        variant: "destructive",
        title: "Consent Required",
        description: "Please consent to receive marketing messages to continue."
      });
      return;
    }
    
    // Save to localStorage just like the native form
    const dataToSave = {
      ...formData,
      transactionalConsent: transactionalConsent,
      marketingConsent: marketingConsent
    };
    localStorage.setItem('cspCustomer', JSON.stringify(dataToSave));
    // Redirect to upload page
    window.location.href = '/upload.html';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="bg-gray-50 py-4">
      <div className="max-width-lg mx-auto px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center pb-2">
            {/* Step Indicator */}
            <div className="flex justify-center items-center gap-4 mb-6">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                1. Contact Info
              </span>
              <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                2. Upload Photos
              </span>
              <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                3. Payment
              </span>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Place Staging Order</h1>
            <p className="text-gray-600 text-center">
              We'll use this information to send you updates about your staging order.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  data-testid="input-firstName"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  data-testid="input-lastName"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  data-testid="input-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Optional"
                  value={formData.phone}
                  onChange={handleChange}
                  data-testid="input-phone"
                />
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="transactionalConsent"
                    checked={transactionalConsent}
                    onCheckedChange={(checked) => setTransactionalConsent(checked === true)}
                    data-testid="checkbox-transactional"
                  />
                  <label htmlFor="transactionalConsent" className="text-sm leading-relaxed cursor-pointer">
                    By checking this box, I consent to receive transactional messages related to my account, orders, or services I have requested. These messages may include appointment reminders, order confirmations, and account notifications among others. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
                  </label>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="marketingConsent"
                    checked={marketingConsent}
                    onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                    data-testid="checkbox-marketing"
                  />
                  <label htmlFor="marketingConsent" className="text-sm leading-relaxed cursor-pointer">
                    By checking this box, I consent to receive marketing and promotional messages, including special offers, discounts, new product updates among others. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
                  </label>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6"
                data-testid="button-continue"
              >
                Continue to Upload Photos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}