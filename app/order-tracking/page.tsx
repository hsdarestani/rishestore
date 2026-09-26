import type {Metadata} from "next";
import OrderTrackingForm from "@/components/OrderTrackingForm";

export const metadata:Metadata={title:"پیگیری سفارش",description:"پیگیری وضعیت سفارش و مرسوله فروشگاه ریشه"};
export default function Page(){return <div className="page-shell container"><OrderTrackingForm/></div>}
