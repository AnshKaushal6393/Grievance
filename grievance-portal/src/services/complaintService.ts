import api from "@/lib/api";

export const complaintService = {
    fileComplaint:async(formData:FormData)=>{
        const response = await api.post("/complaints/creaate",formData,{
            headers:{
                "Content-Type":"multipart/form-data"
            }
        });
        return response.data;
    },
    
}