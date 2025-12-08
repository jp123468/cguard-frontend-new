import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/ui/breadcrumb";
import AppLayout from "@/layouts/app-layout";
import Step1Details from "./components/Step1Details";
import Step2Subscription from "./components/Step2Subscription";
import Step3Payment from "./components/Step3Payment";

export type BranchFormData = {
    // Step 1
    name: string;
    email: string;
    address: string;
    phone: string;
    website: string;
    licenseNumber: string;
    timezone: string;

    // Step 2
    billingCycle: "monthly" | "annual";
    selectedPlan: "essential" | "advance" | "professional" | "";
    modules: {
        visitors: boolean;
        billing: boolean;
        dispatcher: boolean;
        sms: boolean;
        scheduler: boolean;
        payroll: boolean;
        patrol: boolean;
        parking: boolean;
    };

    // Step 3
    paymentMethod: "card" | "google" | "cash" | "amazon" | "bank";
    cardNumber: string;
    expiryDate: string;
    cvc: string;
    country: string;
};

export default function AddBranch() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<BranchFormData>({
        name: "",
        email: "",
        address: "",
        phone: "",
        website: "",
        licenseNumber: "",
        timezone: "",
        billingCycle: "monthly",
        selectedPlan: "",
        modules: {
            visitors: false,
            billing: false,
            dispatcher: false,
            sms: false,
            scheduler: false,
            payroll: false,
            patrol: false,
            parking: false,
        },
        paymentMethod: "card",
        cardNumber: "",
        expiryDate: "",
        cvc: "",
        country: "Ecuador",
    });

    const updateFormData = (data: Partial<BranchFormData>) => {
        setFormData((prev) => ({ ...prev, ...data }));
    };

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = () => {
        console.log("Form submitted:", formData);
        // TODO: Submit to backend
        navigate("/branch");
    };

    return (
        <AppLayout>
            <Breadcrumb
                items={[
                    { label: "Panel de control", path: "/dashboard" },
                    { label: "Nueva sucursal" },
                ]}
            />

            <div className="p-6">
                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-4">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                            >
                                1
                            </div>
                            <span className={currentStep >= 1 ? "text-blue-600 font-medium" : "text-gray-600"}>
                                Detalles de la sucursal
                            </span>
                        </div>

                        <div className="w-16 h-0.5 bg-gray-300" />

                        {/* Step 2 */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                            >
                                2
                            </div>
                            <span className={currentStep >= 2 ? "text-blue-600 font-medium" : "text-gray-600"}>
                                Suscripción
                            </span>
                        </div>

                        <div className="w-16 h-0.5 bg-gray-300" />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                            >
                                3
                            </div>
                            <span className={currentStep >= 3 ? "text-blue-600 font-medium" : "text-gray-600"}>
                                Método de Pago
                            </span>
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                {currentStep === 1 && (
                    <Step1Details
                        data={formData}
                        updateData={updateFormData}
                        onNext={handleNext}
                    />
                )}

                {currentStep === 2 && (
                    <Step2Subscription
                        data={formData}
                        updateData={updateFormData}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                    />
                )}

                {currentStep === 3 && (
                    <Step3Payment
                        data={formData}
                        updateData={updateFormData}
                        onPrevious={handlePrevious}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </AppLayout>
    );
}
