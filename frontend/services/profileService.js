import {supabase} from './supabase';

export const createProfile = async (profile) => {
    const {data, error} = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
    return {data, error};

}

export const getProfile = async (userId) => {
    const {data, error} = await supabase
    .from('profiles')
    .select()
    .eq('id', userId)
    .single();
    return {data, error};
}

export const updateProfile = async (userId, updates) => {
    const {data, error} = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    return {data, error};
}


