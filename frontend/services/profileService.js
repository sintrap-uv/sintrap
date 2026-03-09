import {supabase} from './supabase';

export const createProfile = async (profile) => {
    const {data, error} = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
    return {data, error};

}

export const getProfile = async (userId) => {
    const {data, error} = await supabase
    .from('profiles')
    .select()
    .eq('user_id', userId)
    .single();
    return {data, error};
}

export const updateProfile = async (userId, updates) => {
    const {data, error} = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
    return {data, error};
}


